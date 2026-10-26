"use server";

import type { Session } from "next-auth";
import type { ActionResult } from "@/lib/action-result";
import { requirePermission } from "@/lib/auth";
import { clusterIdFilter, type ClusterScope } from "@/lib/clusters";
import {
  NEW_INDUSTRY_VALUE,
  companyFormSchema,
  companyIdSchema,
  contactFormSchema,
  contactIdSchema,
  type Company,
  type CompanyContact,
  type CompanyDetail,
  type CompanyFormInput,
  type ContactFormInput,
  type IndustryFieldOption,
} from "@/lib/companies";
import { Prisma } from "@/lib/generated/prisma/client";
import type { PermissionName } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const activeContacts = { deleted_at: null } satisfies Prisma.contactsWhereInput;
const contactOrder = [{ is_main_contact: "desc" }, { id: "asc" }] satisfies Prisma.contactsOrderByWithRelationInput[];

const contactSelect = {
  id: true,
  contact_name: true,
  surname: true,
  email: true,
  linkedin: true,
  mobile: true,
  phone: true,
  position: true,
  department: true,
  is_main_contact: true,
} satisfies Prisma.contactsSelect;

const companyFields = {
  id: true,
  name: true,
  website: true,
  vat: true,
  tax_id: true,
  country: true,
  state: true,
  city: true,
  postal_code: true,
  address: true,
  industry_field_id: true,
  number_of_employees: true,
  is_customer: true,
  created_at: true,
  industry_fields: { select: { name: true } },
} satisfies Prisma.companiesSelect;

// Companies are shared across clusters, but the contract count only covers clusters the user can see.
function companyCounts(scope: ClusterScope) {
  return {
    select: {
      contacts: { where: activeContacts },
      contracts: { where: { deleted_at: null, intermediano_company_id: clusterIdFilter(scope) } },
      leads: { where: { deleted_at: null } },
    },
  } satisfies Prisma.CompaniesCountOutputTypeDefaultArgs;
}

// The list only needs the main contact; contacts are ordered so the main one comes first.
function companySelect(scope: ClusterScope) {
  return {
    ...companyFields,
    contacts: { where: activeContacts, orderBy: contactOrder, take: 1, select: contactSelect },
    _count: companyCounts(scope),
  } satisfies Prisma.companiesSelect;
}

function companyDetailSelect(scope: ClusterScope) {
  return {
    ...companyFields,
    users: { select: { name: true } },
    contacts: { where: activeContacts, orderBy: contactOrder, select: contactSelect },
    _count: companyCounts(scope),
  } satisfies Prisma.companiesSelect;
}

type ContactRow = Prisma.contactsGetPayload<{ select: typeof contactSelect }>;
type CompanyRow = Prisma.companiesGetPayload<{ select: ReturnType<typeof companySelect> }>;
type CompanyDetailRow = Prisma.companiesGetPayload<{ select: ReturnType<typeof companyDetailSelect> }>;

function toContact(contact: ContactRow): CompanyContact {
  return {
    id: contact.id.toString(),
    contactName: contact.contact_name,
    surname: contact.surname,
    fullName: [contact.contact_name, contact.surname].filter(Boolean).join(" "),
    email: contact.email,
    linkedin: contact.linkedin,
    mobile: contact.mobile,
    phone: contact.phone,
    position: contact.position,
    department: contact.department,
    isMainContact: contact.is_main_contact,
  };
}

function toCompany(company: CompanyRow | CompanyDetailRow): Company {
  const [mainContact] = company.contacts;
  return {
    id: company.id.toString(),
    name: company.name,
    website: company.website,
    vat: company.vat,
    taxId: company.tax_id,
    country: company.country,
    state: company.state,
    city: company.city,
    postalCode: company.postal_code,
    address: company.address,
    industryFieldId: company.industry_field_id?.toString() ?? null,
    industryName: company.industry_fields?.name ?? null,
    numberOfEmployees: company.number_of_employees,
    isCustomer: company.is_customer,
    mainContact: mainContact ? toContact(mainContact) : null,
    contactCount: company._count.contacts,
    contractCount: company._count.contracts,
    leadCount: company._count.leads,
    createdAt: company.created_at?.toISOString() ?? null,
  };
}

function toCompanyDetail(company: CompanyDetailRow): CompanyDetail {
  return {
    ...toCompany(company),
    addedBy: company.users?.name ?? null,
    contacts: company.contacts.map(toContact),
  };
}

export async function getCompanies(): Promise<Company[]> {
  const session = await requirePermission("companies.view");

  try {
    const companies = await prisma.companies.findMany({
      where: { deleted_at: null },
      orderBy: { name: "asc" },
      select: companySelect(session.user.clusters),
    });
    return companies.map(toCompany);
  } catch (error) {
    console.error("getCompanies failed", { error });
    throw new Error("Could not load companies.");
  }
}

export async function getCompany(companyId: string): Promise<CompanyDetail | null> {
  const session = await requirePermission("companies.view");

  const parsedId = companyIdSchema.safeParse(companyId);
  if (!parsedId.success) return null;

  try {
    const company = await prisma.companies.findFirst({
      where: { id: BigInt(parsedId.data), deleted_at: null },
      select: companyDetailSelect(session.user.clusters),
    });
    return company ? toCompanyDetail(company) : null;
  } catch (error) {
    console.error("getCompany failed", { companyId: parsedId.data, error });
    throw new Error("Could not load this company.");
  }
}

export async function getIndustryFieldOptions(): Promise<IndustryFieldOption[]> {
  await requirePermission("companies.view");

  try {
    const industries = await prisma.industry_fields.findMany({
      where: { deleted_at: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return industries.map((industry) => ({ id: industry.id.toString(), name: industry.name }));
  } catch (error) {
    console.error("getIndustryFieldOptions failed", { error });
    throw new Error("Could not load industries.");
  }
}

async function sessionWithPermission(permission: PermissionName): Promise<Session | null> {
  try {
    return await requirePermission(permission);
  } catch {
    return null;
  }
}

// Thrown inside a transaction to roll it back; the message is safe to show the user.
class UserFacingError extends Error {}

function emptyToNull(value: string) {
  return value === "" ? null : value;
}

// Legacy only enforces unique names among companies that aren't archived, and there's no database index for it.
const DUPLICATE_NAME_ERROR = "A company with this name already exists.";

async function assertUniqueCompanyName(tx: Prisma.TransactionClient, name: string, exceptId: bigint | null) {
  const duplicate = await tx.companies.findFirst({
    where: { name, deleted_at: null, ...(exceptId !== null && { id: { not: exceptId } }) },
    select: { id: true },
  });
  if (duplicate) throw new UserFacingError(DUPLICATE_NAME_ERROR);
}

async function resolveIndustryFieldId(
  tx: Prisma.TransactionClient,
  input: { industryFieldId: string; newIndustryName: string },
  userId: bigint,
  currentIndustryFieldId: bigint | null,
): Promise<bigint | null> {
  if (input.industryFieldId === "") return null;

  if (input.industryFieldId === NEW_INDUSTRY_VALUE) {
    const existing = await tx.industry_fields.findFirst({
      where: { name: input.newIndustryName, deleted_at: null },
      select: { id: true },
    });
    if (existing) return existing.id;

    const now = new Date();
    const created = await tx.industry_fields.create({
      data: { name: input.newIndustryName, user_id: userId, created_at: now, updated_at: now },
      select: { id: true },
    });
    return created.id;
  }

  const industryFieldId = BigInt(input.industryFieldId);
  // A company can keep an industry that was archived after it was assigned.
  if (industryFieldId === currentIndustryFieldId) return industryFieldId;

  const industry = await tx.industry_fields.findFirst({
    where: { id: industryFieldId, deleted_at: null },
    select: { id: true },
  });
  if (!industry) throw new UserFacingError("The selected industry no longer exists.");
  return industry.id;
}

function parseCompanyInput(input: CompanyFormInput) {
  const parsed = companyFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." } as const;
  }
  return { ok: true, data: parsed.data } as const;
}

function toCompanyData(data: ReturnType<typeof companyFormSchema.parse>) {
  return {
    name: data.name,
    website: emptyToNull(data.website),
    vat: emptyToNull(data.vat),
    tax_id: emptyToNull(data.taxId),
    country: emptyToNull(data.country),
    state: emptyToNull(data.state),
    city: emptyToNull(data.city),
    postal_code: emptyToNull(data.postalCode),
    address: emptyToNull(data.address),
    number_of_employees: data.numberOfEmployees === "" ? null : Number(data.numberOfEmployees),
    is_customer: data.isCustomer,
  };
}

export async function createCompany(input: CompanyFormInput): Promise<ActionResult<{ id: string }>> {
  const session = await sessionWithPermission("companies.manage");
  if (!session) return { ok: false, error: "You don't have permission to add companies." };

  const parsed = parseCompanyInput(input);
  if (!parsed.ok) return parsed;

  try {
    const userId = BigInt(session.user.id);
    const company = await prisma.$transaction(async (tx) => {
      await assertUniqueCompanyName(tx, parsed.data.name, null);
      const industryFieldId = await resolveIndustryFieldId(tx, parsed.data, userId, null);
      const now = new Date();
      return tx.companies.create({
        data: {
          ...toCompanyData(parsed.data),
          industry_field_id: industryFieldId,
          user_id: userId,
          created_at: now,
          updated_at: now,
        },
        select: { id: true },
      });
    });
    return { ok: true, data: { id: company.id.toString() } };
  } catch (error) {
    if (error instanceof UserFacingError) return { ok: false, error: error.message };
    console.error("createCompany failed", { error });
    return { ok: false, error: "Could not add this company. Try again." };
  }
}

export async function updateCompany(companyId: string, input: CompanyFormInput): Promise<ActionResult<{ id: string }>> {
  const session = await sessionWithPermission("companies.manage");
  if (!session) return { ok: false, error: "You don't have permission to edit companies." };

  const parsedId = companyIdSchema.safeParse(companyId);
  if (!parsedId.success) return { ok: false, error: "Unknown company." };

  const parsed = parseCompanyInput(input);
  if (!parsed.ok) return parsed;

  try {
    const id = BigInt(parsedId.data);
    const userId = BigInt(session.user.id);
    await prisma.$transaction(async (tx) => {
      const current = await tx.companies.findFirst({
        where: { id, deleted_at: null },
        select: { industry_field_id: true },
      });
      if (!current) throw new UserFacingError("This company no longer exists.");

      await assertUniqueCompanyName(tx, parsed.data.name, id);
      const industryFieldId = await resolveIndustryFieldId(tx, parsed.data, userId, current.industry_field_id);
      await tx.companies.update({
        where: { id },
        data: { ...toCompanyData(parsed.data), industry_field_id: industryFieldId, updated_at: new Date() },
      });
    });
    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    if (error instanceof UserFacingError) return { ok: false, error: error.message };
    console.error("updateCompany failed", { companyId: parsedId.data, error });
    return { ok: false, error: "Could not save this company. Try again." };
  }
}

export async function archiveCompany(companyId: string): Promise<ActionResult<{ id: string }>> {
  if (!(await sessionWithPermission("companies.manage"))) {
    return { ok: false, error: "You don't have permission to archive companies." };
  }

  const parsedId = companyIdSchema.safeParse(companyId);
  if (!parsedId.success) return { ok: false, error: "Unknown company." };

  try {
    const now = new Date();
    const result = await prisma.companies.updateMany({
      where: { id: BigInt(parsedId.data), deleted_at: null },
      data: { deleted_at: now, updated_at: now },
    });
    if (result.count === 0) return { ok: false, error: "This company is already archived." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("archiveCompany failed", { companyId: parsedId.data, error });
    return { ok: false, error: "Could not archive this company. Try again." };
  }
}

function parseContactInput(input: ContactFormInput) {
  const parsed = contactFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." } as const;
  }
  return { ok: true, data: parsed.data } as const;
}

function toContactData(data: ReturnType<typeof contactFormSchema.parse>) {
  return {
    contact_name: data.contactName,
    surname: emptyToNull(data.surname),
    email: emptyToNull(data.email),
    linkedin: emptyToNull(data.linkedin),
    mobile: emptyToNull(data.mobile),
    phone: emptyToNull(data.phone),
    position: emptyToNull(data.position),
    department: emptyToNull(data.department),
    is_main_contact: data.isMainContact,
  };
}

// A company has at most one main contact.
async function clearMainContact(tx: Prisma.TransactionClient, companyId: bigint, exceptContactId: bigint | null) {
  await tx.contacts.updateMany({
    where: {
      company_id: companyId,
      is_main_contact: true,
      deleted_at: null,
      ...(exceptContactId !== null && { id: { not: exceptContactId } }),
    },
    data: { is_main_contact: false, updated_at: new Date() },
  });
}

const editableContact = (contactId: bigint) =>
  ({ id: contactId, deleted_at: null, companies: { is: { deleted_at: null } } }) satisfies Prisma.contactsWhereInput;

export async function createContact(companyId: string, input: ContactFormInput): Promise<ActionResult<{ id: string }>> {
  const session = await sessionWithPermission("contacts.manage");
  if (!session) return { ok: false, error: "You don't have permission to add contacts." };

  const parsedCompanyId = companyIdSchema.safeParse(companyId);
  if (!parsedCompanyId.success) return { ok: false, error: "Unknown company." };

  const parsed = parseContactInput(input);
  if (!parsed.ok) return parsed;

  try {
    const id = BigInt(parsedCompanyId.data);
    const contact = await prisma.$transaction(async (tx) => {
      const company = await tx.companies.findFirst({ where: { id, deleted_at: null }, select: { id: true } });
      if (!company) throw new UserFacingError("This company no longer exists.");

      if (parsed.data.isMainContact) await clearMainContact(tx, id, null);
      const now = new Date();
      return tx.contacts.create({
        data: {
          ...toContactData(parsed.data),
          company_id: id,
          user_id: BigInt(session.user.id),
          created_at: now,
          updated_at: now,
        },
        select: { id: true },
      });
    });
    return { ok: true, data: { id: contact.id.toString() } };
  } catch (error) {
    if (error instanceof UserFacingError) return { ok: false, error: error.message };
    console.error("createContact failed", { companyId: parsedCompanyId.data, error });
    return { ok: false, error: "Could not add this contact. Try again." };
  }
}

export async function updateContact(contactId: string, input: ContactFormInput): Promise<ActionResult<{ id: string }>> {
  if (!(await sessionWithPermission("contacts.manage"))) {
    return { ok: false, error: "You don't have permission to edit contacts." };
  }

  const parsedId = contactIdSchema.safeParse(contactId);
  if (!parsedId.success) return { ok: false, error: "Unknown contact." };

  const parsed = parseContactInput(input);
  if (!parsed.ok) return parsed;

  try {
    const id = BigInt(parsedId.data);
    await prisma.$transaction(async (tx) => {
      const contact = await tx.contacts.findFirst({ where: editableContact(id), select: { company_id: true } });
      if (!contact) throw new UserFacingError("This contact no longer exists.");

      if (parsed.data.isMainContact && contact.company_id !== null) {
        await clearMainContact(tx, contact.company_id, id);
      }
      await tx.contacts.update({ where: { id }, data: { ...toContactData(parsed.data), updated_at: new Date() } });
    });
    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    if (error instanceof UserFacingError) return { ok: false, error: error.message };
    console.error("updateContact failed", { contactId: parsedId.data, error });
    return { ok: false, error: "Could not save this contact. Try again." };
  }
}

export async function setMainContact(contactId: string): Promise<ActionResult<{ id: string }>> {
  if (!(await sessionWithPermission("contacts.manage"))) {
    return { ok: false, error: "You don't have permission to edit contacts." };
  }

  const parsedId = contactIdSchema.safeParse(contactId);
  if (!parsedId.success) return { ok: false, error: "Unknown contact." };

  try {
    const id = BigInt(parsedId.data);
    await prisma.$transaction(async (tx) => {
      const contact = await tx.contacts.findFirst({ where: editableContact(id), select: { company_id: true } });
      if (!contact) throw new UserFacingError("This contact no longer exists.");

      if (contact.company_id !== null) await clearMainContact(tx, contact.company_id, id);
      await tx.contacts.update({ where: { id }, data: { is_main_contact: true, updated_at: new Date() } });
    });
    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    if (error instanceof UserFacingError) return { ok: false, error: error.message };
    console.error("setMainContact failed", { contactId: parsedId.data, error });
    return { ok: false, error: "Could not update the main contact. Try again." };
  }
}

export async function removeContact(contactId: string): Promise<ActionResult<{ id: string }>> {
  if (!(await sessionWithPermission("contacts.manage"))) {
    return { ok: false, error: "You don't have permission to remove contacts." };
  }

  const parsedId = contactIdSchema.safeParse(contactId);
  if (!parsedId.success) return { ok: false, error: "Unknown contact." };

  try {
    const now = new Date();
    const result = await prisma.contacts.updateMany({
      where: editableContact(BigInt(parsedId.data)),
      data: { deleted_at: now, updated_at: now },
    });
    if (result.count === 0) return { ok: false, error: "This contact was already removed." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("removeContact failed", { contactId: parsedId.data, error });
    return { ok: false, error: "Could not remove this contact. Try again." };
  }
}
