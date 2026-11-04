"use server";

import bcrypt from "bcryptjs";
import type { ActionResult } from "@/lib/action-result";
import { requirePermission } from "@/lib/auth";
import { companyIdSchema } from "@/lib/companies";
import {
  customerAccountCreateSchema,
  customerAccountFormSchema,
  customerAccountIdSchema,
  customerAccountListQuerySchema,
  passwordResetSchema,
  toAccountLink,
  toLaravelBcrypt,
  type CustomerAccount,
  type CustomerAccountCreateInput,
  type CustomerAccountFormInput,
  type CustomerAccountList,
  type CustomerAccountListQuery,
  type CustomerAccountOptions,
  type PasswordResetInput,
} from "@/lib/customer-accounts";
import { Prisma } from "@/lib/generated/prisma/client";
import { pageArgs } from "@/lib/pagination";
import type { PermissionName } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// Laravel hashes with 12 rounds; matching it keeps sign-in time the same in both apps.
const BCRYPT_ROUNDS = 12;

const accountSelect = {
  id: true,
  name: true,
  email: true,
  company_id: true,
  partner_id: true,
  deleted_at: true,
  created_at: true,
  companies: { select: { name: true } },
  partners: { select: { partner_name: true, contact_name: true } },
} satisfies Prisma.customersSelect;

type AccountRow = Prisma.customersGetPayload<{ select: typeof accountSelect }>;

function partnerLabel(partner: { partner_name: string | null; contact_name: string | null } | null, id: bigint | null) {
  if (!partner) return null;
  return partner.partner_name?.trim() || partner.contact_name?.trim() || `Partner #${id}`;
}

function toCustomerAccount(row: AccountRow): CustomerAccount {
  return {
    id: row.id.toString(),
    type: row.company_id === null && row.partner_id !== null ? "partner" : "company",
    companyId: row.company_id?.toString() ?? null,
    companyName: row.companies?.name ?? null,
    partnerId: row.partner_id?.toString() ?? null,
    partnerName: partnerLabel(row.partners, row.partner_id),
    name: row.name,
    email: row.email,
    archived: row.deleted_at !== null,
    createdAt: row.created_at?.toISOString() ?? null,
  };
}

function accountListWhere(query: CustomerAccountListQuery): Prisma.customersWhereInput {
  const filters: Prisma.customersWhereInput[] = [
    { deleted_at: query.status === "archived" ? { not: null } : null },
  ];
  if (query.search) {
    filters.push({
      OR: [
        { name: { contains: query.search } },
        { email: { contains: query.search } },
        { companies: { is: { name: { contains: query.search } } } },
        { partners: { is: { partner_name: { contains: query.search } } } },
      ],
    });
  }
  return { AND: filters };
}

export async function getCustomerAccounts(query?: CustomerAccountListQuery): Promise<CustomerAccountList> {
  await requirePermission("portal_accounts.list");
  const listQuery = customerAccountListQuerySchema.parse(query ?? {});

  try {
    const where = accountListWhere(listQuery);
    const [accounts, total, active, archived] = await Promise.all([
      prisma.customers.findMany({
        where,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: accountSelect,
        ...pageArgs(listQuery.page),
      }),
      prisma.customers.count({ where }),
      prisma.customers.count({ where: { deleted_at: null } }),
      prisma.customers.count({ where: { deleted_at: { not: null } } }),
    ]);
    return { accounts: accounts.map(toCustomerAccount), total, stats: { active, archived } };
  } catch (error) {
    console.error("getCustomerAccounts failed", { error });
    throw new Error("Could not load portal accounts.");
  }
}

export async function getCompanyCustomerAccounts(companyId: string): Promise<CustomerAccount[]> {
  await requirePermission("portal_accounts.list");

  const parsedId = companyIdSchema.safeParse(companyId);
  if (!parsedId.success) return [];

  try {
    const accounts = await prisma.customers.findMany({
      where: { company_id: BigInt(parsedId.data) },
      orderBy: [{ deleted_at: "asc" }, { name: "asc" }],
      select: accountSelect,
    });
    return accounts.map(toCustomerAccount);
  } catch (error) {
    console.error("getCompanyCustomerAccounts failed", { companyId: parsedId.data, error });
    throw new Error("Could not load this company's portal accounts.");
  }
}

export async function getCustomerAccountOptions(): Promise<CustomerAccountOptions> {
  await requirePermission("portal_accounts.list");

  try {
    const [companies, partners] = await Promise.all([
      prisma.companies.findMany({
        where: { deleted_at: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.partners.findMany({
        where: { deleted_at: null },
        orderBy: { partner_name: "asc" },
        select: { id: true, partner_name: true, contact_name: true },
      }),
    ]);
    return {
      companies: companies.map((company) => ({ id: company.id.toString(), name: company.name })),
      partners: partners.map((partner) => ({ id: partner.id.toString(), name: partnerLabel(partner, partner.id) ?? "" })),
    };
  } catch (error) {
    console.error("getCustomerAccountOptions failed", { error });
    throw new Error("Could not load companies and partners.");
  }
}

async function canManageAccounts(permission: PermissionName) {
  try {
    await requirePermission(permission);
    return true;
  } catch {
    return false;
  }
}

function firstIssue(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

function isUniqueEmailError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

const DUPLICATE_EMAIL_ERROR = "Another portal account already uses this email.";

// The unique index also covers archived accounts, so the message says which one to restore.
async function emailConflict(email: string, exceptId: bigint | null): Promise<string | null> {
  const existing = await prisma.customers.findFirst({
    where: { email, ...(exceptId !== null && { id: { not: exceptId } }) },
    select: { deleted_at: true },
  });
  if (!existing) return null;
  return existing.deleted_at
    ? "An archived portal account uses this email. Restore that account instead."
    : DUPLICATE_EMAIL_ERROR;
}

async function linkError(link: ReturnType<typeof toAccountLink>): Promise<string | null> {
  if (link.company_id !== null) {
    const company = await prisma.companies.findFirst({ where: { id: link.company_id, deleted_at: null }, select: { id: true } });
    return company ? null : "That company no longer exists.";
  }
  if (link.partner_id !== null) {
    const partner = await prisma.partners.findFirst({ where: { id: link.partner_id, deleted_at: null }, select: { id: true } });
    return partner ? null : "That partner no longer exists.";
  }
  return "Choose a company or a partner.";
}

async function hashPassword(password: string) {
  return toLaravelBcrypt(await bcrypt.hash(password, BCRYPT_ROUNDS));
}

export async function createCustomerAccount(input: CustomerAccountCreateInput): Promise<ActionResult<CustomerAccount>> {
  if (!(await canManageAccounts("portal_accounts.create"))) return { ok: false, error: "You don't have permission to add portal accounts." };

  const parsed = customerAccountCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { account, password } = parsed.data;

  try {
    const link = toAccountLink(account);
    const problem = (await linkError(link)) ?? (await emailConflict(account.email, null));
    if (problem) return { ok: false, error: problem };

    const now = new Date();
    const created = await prisma.customers.create({
      data: {
        ...link,
        name: account.name,
        email: account.email,
        password: await hashPassword(password),
        created_at: now,
        updated_at: now,
      },
      select: accountSelect,
    });
    return { ok: true, data: toCustomerAccount(created) };
  } catch (error) {
    if (isUniqueEmailError(error)) return { ok: false, error: DUPLICATE_EMAIL_ERROR };
    console.error("createCustomerAccount failed", { error });
    return { ok: false, error: "Could not add this portal account. Try again." };
  }
}

export async function updateCustomerAccount(
  accountId: string,
  input: CustomerAccountFormInput,
): Promise<ActionResult<CustomerAccount>> {
  if (!(await canManageAccounts("portal_accounts.edit"))) return { ok: false, error: "You don't have permission to edit portal accounts." };

  const parsedId = customerAccountIdSchema.safeParse(accountId);
  if (!parsedId.success) return { ok: false, error: "Unknown portal account." };

  const parsed = customerAccountFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  try {
    const id = BigInt(parsedId.data);
    const current = await prisma.customers.findFirst({ where: { id, deleted_at: null }, select: { id: true } });
    if (!current) return { ok: false, error: "This portal account no longer exists or is archived." };

    const link = toAccountLink(parsed.data);
    const problem = (await linkError(link)) ?? (await emailConflict(parsed.data.email, id));
    if (problem) return { ok: false, error: problem };

    const updated = await prisma.customers.update({
      where: { id },
      data: { ...link, name: parsed.data.name, email: parsed.data.email, updated_at: new Date() },
      select: accountSelect,
    });
    return { ok: true, data: toCustomerAccount(updated) };
  } catch (error) {
    if (isUniqueEmailError(error)) return { ok: false, error: DUPLICATE_EMAIL_ERROR };
    console.error("updateCustomerAccount failed", { accountId: parsedId.data, error });
    return { ok: false, error: "Could not save this portal account. Try again." };
  }
}

export async function resetCustomerAccountPassword(
  accountId: string,
  input: PasswordResetInput,
): Promise<ActionResult<{ id: string }>> {
  if (!(await canManageAccounts("portal_accounts.edit"))) return { ok: false, error: "You don't have permission to reset passwords." };

  const parsedId = customerAccountIdSchema.safeParse(accountId);
  if (!parsedId.success) return { ok: false, error: "Unknown portal account." };

  const parsed = passwordResetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  try {
    const result = await prisma.customers.updateMany({
      where: { id: BigInt(parsedId.data), deleted_at: null },
      data: { password: await hashPassword(parsed.data.password), updated_at: new Date() },
    });
    if (result.count === 0) return { ok: false, error: "This portal account no longer exists or is archived." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("resetCustomerAccountPassword failed", { accountId: parsedId.data, error });
    return { ok: false, error: "Could not reset the password. Try again." };
  }
}

// Archiving signs the customer out of the portal within a minute, when their session is next re-checked.
export async function archiveCustomerAccount(accountId: string): Promise<ActionResult<{ id: string }>> {
  if (!(await canManageAccounts("portal_accounts.delete"))) return { ok: false, error: "You don't have permission to archive portal accounts." };

  const parsedId = customerAccountIdSchema.safeParse(accountId);
  if (!parsedId.success) return { ok: false, error: "Unknown portal account." };

  try {
    const now = new Date();
    const result = await prisma.customers.updateMany({
      where: { id: BigInt(parsedId.data), deleted_at: null },
      data: { deleted_at: now, updated_at: now },
    });
    if (result.count === 0) return { ok: false, error: "This portal account is already archived." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("archiveCustomerAccount failed", { accountId: parsedId.data, error });
    return { ok: false, error: "Could not archive this portal account. Try again." };
  }
}

export async function restoreCustomerAccount(accountId: string): Promise<ActionResult<{ id: string }>> {
  if (!(await canManageAccounts("portal_accounts.delete"))) return { ok: false, error: "You don't have permission to restore portal accounts." };

  const parsedId = customerAccountIdSchema.safeParse(accountId);
  if (!parsedId.success) return { ok: false, error: "Unknown portal account." };

  try {
    const result = await prisma.customers.updateMany({
      where: { id: BigInt(parsedId.data), deleted_at: { not: null } },
      data: { deleted_at: null, updated_at: new Date() },
    });
    if (result.count === 0) return { ok: false, error: "This portal account is already active." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("restoreCustomerAccount failed", { accountId: parsedId.data, error });
    return { ok: false, error: "Could not restore this portal account. Try again." };
  }
}
