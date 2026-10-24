"use server";

import type { ActionResult } from "@/lib/action-result";
import { requireAdminSession, requirePermission } from "@/lib/auth";
import {
  canAccessCluster,
  clusterIdFilter,
  clusterIdSchema,
  type Cluster,
  type ClusterOption,
  type ClusterScope,
} from "@/lib/clusters";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  companyFormSchema,
  type CompanyFormInput,
  type CompanyRoleAccess,
  type CountryOption,
  type IntermedianoCompany,
} from "@/lib/intermediano-companies";
import { ADMIN_ROLE_NAME, MANAGE_INTERMEDIANO_COMPANIES_PERMISSION } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function getClusters(): Promise<Cluster[]> {
  const session = await requireAdminSession();

  try {
    const companies = await prisma.intermediano_companies.findMany({
      where: { deleted_at: null, id: clusterIdFilter(session.user.clusters) },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    return companies.map((company) => ({
      id: company.id.toString(),
      label: company.name,
    }));
  } catch (error) {
    console.error("getClusters failed", { error });
    throw new Error("Could not load clusters.");
  }
}

export async function getAssignableClusters(): Promise<ClusterOption[]> {
  await requirePermission("users.view");

  try {
    const companies = await prisma.intermediano_companies.findMany({
      where: { deleted_at: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, countries: { select: { name: true } } },
    });

    return companies.map((company) => ({
      id: company.id.toString(),
      label: company.name,
      country: company.countries.name,
    }));
  } catch (error) {
    console.error("getAssignableClusters failed", { error });
    throw new Error("Could not load clusters.");
  }
}

function startOfTodayUtc() {
  return new Date(new Date().toISOString().slice(0, 10));
}

function companySelect() {
  return {
    id: true,
    name: true,
    tax_id: true,
    country_id: true,
    contact_name: true,
    email: true,
    mobile_number: true,
    address: true,
    created_at: true,
    countries: { select: { name: true } },
    _count: {
      select: {
        employees: { where: { deleted_at: null } },
        contracts: {
          where: { deleted_at: null, OR: [{ end_date: null }, { end_date: { gte: startOfTodayUtc() } }] },
        },
        staff_trackers: { where: { deleted_at: null } },
      },
    },
  } satisfies Prisma.intermediano_companiesSelect;
}

type CompanyRow = Prisma.intermediano_companiesGetPayload<{ select: ReturnType<typeof companySelect> }>;

async function findRolesWithAccess(companyIds: bigint[]) {
  const roles = await prisma.roles.findMany({
    where: {
      OR: [
        { name: ADMIN_ROLE_NAME },
        { all_clusters: true },
        { role_clusters: { some: { intermediano_company_id: { in: companyIds } } } },
      ],
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      all_clusters: true,
      role_clusters: {
        where: { intermediano_company_id: { in: companyIds } },
        select: { intermediano_company_id: true },
      },
    },
  });

  return (companyId: bigint): CompanyRoleAccess[] =>
    roles.flatMap((role): CompanyRoleAccess[] => {
      if (role.name === ADMIN_ROLE_NAME || role.all_clusters) {
        return [{ id: role.id.toString(), name: role.name, scope: "all" }];
      }
      const isLinked = role.role_clusters.some((link) => link.intermediano_company_id === companyId);
      return isLinked ? [{ id: role.id.toString(), name: role.name, scope: "selected" }] : [];
    });
}

function toIntermedianoCompany(company: CompanyRow, roles: CompanyRoleAccess[]): IntermedianoCompany {
  return {
    id: company.id.toString(),
    name: company.name,
    taxId: company.tax_id,
    countryId: company.country_id.toString(),
    countryName: company.countries.name,
    contactName: company.contact_name,
    email: company.email,
    mobileNumber: company.mobile_number,
    address: company.address,
    employeeCount: company._count.employees,
    activeContractCount: company._count.contracts,
    staffTrackerCount: company._count.staff_trackers,
    roles,
    createdAt: company.created_at?.toISOString() ?? null,
  };
}

export async function getIntermedianoCompanies(): Promise<IntermedianoCompany[]> {
  const session = await requirePermission("intermediano_companies.view");

  try {
    const companies = await prisma.intermediano_companies.findMany({
      where: { deleted_at: null, id: clusterIdFilter(session.user.clusters) },
      orderBy: { name: "asc" },
      select: companySelect(),
    });
    const rolesFor = await findRolesWithAccess(companies.map((company) => company.id));

    return companies.map((company) => toIntermedianoCompany(company, rolesFor(company.id)));
  } catch (error) {
    console.error("getIntermedianoCompanies failed", { error });
    throw new Error("Could not load Intermediano companies.");
  }
}

export async function getIntermedianoCompany(companyId: string): Promise<IntermedianoCompany | null> {
  const session = await requirePermission("intermediano_companies.view");

  const parsedId = clusterIdSchema.safeParse(companyId);
  if (!parsedId.success || !canAccessCluster(session.user.clusters, parsedId.data)) return null;

  try {
    const company = await prisma.intermediano_companies.findFirst({
      where: { id: BigInt(parsedId.data), deleted_at: null },
      select: companySelect(),
    });
    if (!company) return null;

    const rolesFor = await findRolesWithAccess([company.id]);
    return toIntermedianoCompany(company, rolesFor(company.id));
  } catch (error) {
    console.error("getIntermedianoCompany failed", { companyId: parsedId.data, error });
    throw new Error("Could not load this company.");
  }
}

export async function getCountryOptions(): Promise<CountryOption[]> {
  await requirePermission("intermediano_companies.view");

  try {
    const countries = await prisma.countries.findMany({
      where: { deleted_at: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return countries.map((country) => ({ id: country.id.toString(), name: country.name }));
  } catch (error) {
    console.error("getCountryOptions failed", { error });
    throw new Error("Could not load countries.");
  }
}

async function requireManageScope(): Promise<ClusterScope | null> {
  try {
    const session = await requirePermission(MANAGE_INTERMEDIANO_COMPANIES_PERMISSION);
    return session.user.clusters;
  } catch {
    return null;
  }
}

async function validateCompanyInput(
  input: CompanyFormInput,
  excludeCompanyId: bigint | null,
): Promise<ActionResult<Prisma.intermediano_companiesUncheckedCreateInput>> {
  const parsed = companyFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const countryId = BigInt(parsed.data.countryId);
  const country = await prisma.countries.findFirst({ where: { id: countryId, deleted_at: null }, select: { id: true } });
  if (!country) return { ok: false, error: "The selected country no longer exists." };

  const duplicate = await prisma.intermediano_companies.findFirst({
    where: {
      tax_id: parsed.data.taxId,
      deleted_at: null,
      ...(excludeCompanyId === null ? {} : { id: { not: excludeCompanyId } }),
    },
    select: { name: true },
  });
  if (duplicate) return { ok: false, error: `${duplicate.name} already uses this tax ID.` };

  return {
    ok: true,
    data: {
      name: parsed.data.name,
      country_id: countryId,
      tax_id: parsed.data.taxId,
      contact_name: parsed.data.contactName,
      email: parsed.data.email,
      mobile_number: parsed.data.mobileNumber,
      address: parsed.data.address,
    },
  };
}

export async function createIntermedianoCompany(input: CompanyFormInput): Promise<ActionResult<{ id: string }>> {
  if (!(await requireManageScope())) {
    return { ok: false, error: "You don't have permission to add companies." };
  }

  try {
    const validated = await validateCompanyInput(input, null);
    if (!validated.ok) return validated;

    const now = new Date();
    const company = await prisma.intermediano_companies.create({
      data: { ...validated.data, created_at: now, updated_at: now },
      select: { id: true },
    });
    return { ok: true, data: { id: company.id.toString() } };
  } catch (error) {
    console.error("createIntermedianoCompany failed", { error });
    return { ok: false, error: "Could not add this company. Try again." };
  }
}

export async function updateIntermedianoCompany(
  companyId: string,
  input: CompanyFormInput,
): Promise<ActionResult<{ id: string }>> {
  const scope = await requireManageScope();
  if (!scope) return { ok: false, error: "You don't have permission to edit companies." };

  const parsedId = clusterIdSchema.safeParse(companyId);
  if (!parsedId.success || !canAccessCluster(scope, parsedId.data)) {
    return { ok: false, error: "Unknown company." };
  }

  try {
    const id = BigInt(parsedId.data);
    const validated = await validateCompanyInput(input, id);
    if (!validated.ok) return validated;

    const result = await prisma.intermediano_companies.updateMany({
      where: { id, deleted_at: null },
      data: { ...validated.data, updated_at: new Date() },
    });
    if (result.count === 0) return { ok: false, error: "This company no longer exists." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("updateIntermedianoCompany failed", { companyId: parsedId.data, error });
    return { ok: false, error: "Could not save this company. Try again." };
  }
}

export async function archiveIntermedianoCompany(companyId: string): Promise<ActionResult<{ id: string }>> {
  const scope = await requireManageScope();
  if (!scope) return { ok: false, error: "You don't have permission to archive companies." };

  const parsedId = clusterIdSchema.safeParse(companyId);
  if (!parsedId.success || !canAccessCluster(scope, parsedId.data)) {
    return { ok: false, error: "Unknown company." };
  }

  try {
    const now = new Date();
    const result = await prisma.intermediano_companies.updateMany({
      where: { id: BigInt(parsedId.data), deleted_at: null },
      data: { deleted_at: now, updated_at: now },
    });
    if (result.count === 0) return { ok: false, error: "This company is already archived." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("archiveIntermedianoCompany failed", { companyId: parsedId.data, error });
    return { ok: false, error: "Could not archive this company. Try again." };
  }
}
