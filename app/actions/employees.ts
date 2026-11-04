"use server";

import bcrypt from "bcryptjs";
import type { ActionResult } from "@/lib/action-result";
import { requireClusterPermission } from "@/lib/auth";
import { deriveContractStatus } from "@/lib/contracts";
import type { EmployeeProfileOverview } from "@/lib/employee-profile";
import { loadEmployeeDocuments, loadEmployeeProfile } from "@/lib/employee-profile/records";
import {
  employeeCreateSchema,
  employeeFormSchema,
  employeeIdSchema,
  employeeListQuerySchema,
  type ClusterEmployee,
  type ClusterEmployees,
  type ConsultantOption,
  type EmployeeCreateInput,
  type EmployeeDetail,
  type EmployeeFormInput,
  type EmployeeListQuery,
} from "@/lib/employees";
import { Prisma } from "@/lib/generated/prisma/client";
import { pageArgs } from "@/lib/pagination";
import { passwordResetSchema, toLaravelBcrypt, type PasswordResetInput } from "@/lib/passwords";
import type { PermissionName } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// Laravel hashes with 12 rounds; matching it keeps sign-in time the same in both apps.
const BCRYPT_ROUNDS = 12;

function toIsoDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

export async function getClusterEmployees(clusterId: string, query?: EmployeeListQuery): Promise<ClusterEmployees> {
  const { clusterId: companyId } = await requireClusterPermission(clusterId, "employees.list");
  const listQuery = employeeListQuerySchema.parse(query ?? {});

  const clusterContracts = {
    intermediano_company_id: companyId,
    deleted_at: null,
  };
  const latestContract = {
    where: clusterContracts,
    orderBy: [{ start_date: "desc" }, { id: "desc" }],
    take: 1,
  } satisfies Prisma.employees$contractsArgs;

  const clusterWhere = { deleted_at: null, intermediano_company_id: companyId } satisfies Prisma.employeesWhereInput;
  const where: Prisma.employeesWhereInput = listQuery.search
    ? {
        AND: [
          clusterWhere,
          {
            OR: [
              { name: { contains: listQuery.search } },
              { email: { contains: listQuery.search } },
              { contracts: { some: { ...clusterContracts, job_title: { contains: listQuery.search } } } },
              {
                contracts: {
                  some: { ...clusterContracts, companies: { is: { name: { contains: listQuery.search } } } },
                },
              },
            ],
          },
        ],
      }
    : clusterWhere;

  try {
    const now = new Date();
    const [employees, total, statusRows] = await Promise.all([
      prisma.employees.findMany({
        where,
        orderBy: { name: "asc" },
        ...pageArgs(listQuery.page),
        select: {
          id: true,
          name: true,
          email: true,
          consultants: { select: { name: true } },
          contracts: {
            ...latestContract,
            select: {
              job_title: true,
              start_date: true,
              end_date: true,
              signature: true,
              admin_signature: true,
              companies: { select: { name: true } },
            },
          },
        },
      }),
      prisma.employees.count({ where }),
      // Statuses depend on each employee's latest contract, so only the fields that decide them are read.
      prisma.employees.findMany({
        where: clusterWhere,
        select: {
          contracts: {
            ...latestContract,
            select: { start_date: true, end_date: true, signature: true, admin_signature: true },
          },
        },
      }),
    ]);

    const statuses = statusRows.map((employee) => deriveContractStatus(employee.contracts[0], now));
    return {
      employees: employees.map((employee) => toClusterEmployee(employee, now)),
      total,
      stats: {
        employees: statusRows.length,
        active: statuses.filter((status) => status === "active").length,
        pendingSignature: statuses.filter((status) => status === "pending_signature").length,
      },
    };
  } catch (error) {
    console.error("getClusterEmployees failed", { clusterId: companyId.toString(), error });
    throw new Error("Could not load employees for this cluster.");
  }
}

type ClusterEmployeeRow = {
  id: bigint;
  name: string;
  email: string;
  consultants: { name: string } | null;
  contracts: {
    job_title: string | null;
    start_date: Date | null;
    end_date: Date | null;
    signature: string | null;
    admin_signature: string | null;
    companies: { name: string } | null;
  }[];
};

function toClusterEmployee(employee: ClusterEmployeeRow, now: Date): ClusterEmployee {
  const [contract] = employee.contracts;
  return {
    id: employee.id.toString(),
    name: employee.name,
    email: employee.email,
    position: contract?.job_title ?? null,
    clientCompany: contract?.companies?.name ?? null,
    consultant: employee.consultants?.name ?? null,
    contractStart: toIsoDate(contract?.start_date ?? null),
    contractEnd: toIsoDate(contract?.end_date ?? null),
    contractStatus: deriveContractStatus(contract, now),
  };
}

export async function getEmployee(clusterId: string, employeeId: string): Promise<EmployeeDetail | null> {
  const { clusterId: companyId } = await requireClusterPermission(clusterId, "employees.show");

  const parsedId = employeeIdSchema.safeParse(employeeId);
  if (!parsedId.success) return null;

  try {
    const employee = await prisma.employees.findFirst({
      where: { id: BigInt(parsedId.data), intermediano_company_id: companyId, deleted_at: null },
      select: {
        id: true,
        name: true,
        email: true,
        consultant_id: true,
        created_at: true,
        consultants: { select: { name: true } },
        intermediano_companies: { select: { name: true } },
        contracts: {
          where: { intermediano_company_id: companyId, deleted_at: null },
          orderBy: [{ start_date: "desc" }, { id: "desc" }],
          select: {
            id: true,
            job_title: true,
            start_date: true,
            end_date: true,
            signature: true,
            admin_signature: true,
            companies: { select: { name: true } },
          },
        },
      },
    });
    if (!employee) return null;

    const now = new Date();

    return {
      id: employee.id.toString(),
      name: employee.name,
      email: employee.email,
      consultantId: employee.consultant_id?.toString() ?? null,
      consultantName: employee.consultants?.name ?? null,
      clusterId: companyId.toString(),
      clusterLabel: employee.intermediano_companies?.name ?? "",
      createdAt: employee.created_at?.toISOString() ?? null,
      contracts: employee.contracts.map((contract) => ({
        id: contract.id.toString(),
        jobTitle: contract.job_title,
        clientCompany: contract.companies?.name ?? null,
        startDate: toIsoDate(contract.start_date),
        endDate: toIsoDate(contract.end_date),
        status: deriveContractStatus(contract, now),
      })),
    };
  } catch (error) {
    console.error("getEmployee failed", { clusterId: companyId.toString(), employeeId: parsedId.data, error });
    throw new Error("Could not load this employee.");
  }
}

// Read-only for admins; employees fill these in from their own portal.
export async function getEmployeeProfile(clusterId: string, employeeId: string): Promise<EmployeeProfileOverview | null> {
  const { clusterId: companyId } = await requireClusterPermission(clusterId, "employees.show");

  const parsedId = employeeIdSchema.safeParse(employeeId);
  if (!parsedId.success) return null;

  try {
    const id = BigInt(parsedId.data);
    const employee = await prisma.employees.findFirst({
      where: { id, intermediano_company_id: companyId, deleted_at: null },
      select: { id: true },
    });
    if (!employee) return null;

    const [profile, documents] = await Promise.all([loadEmployeeProfile(id), loadEmployeeDocuments(id)]);
    return { profile, documents };
  } catch (error) {
    console.error("getEmployeeProfile failed", { clusterId: companyId.toString(), employeeId: parsedId.data, error });
    throw new Error("Could not load this employee's profile.");
  }
}

async function findClusterCountryId(companyId: bigint) {
  const company = await prisma.intermediano_companies.findFirst({
    where: { id: companyId, deleted_at: null },
    select: { country_id: true },
  });
  return company?.country_id ?? null;
}

export async function getConsultantOptions(clusterId: string): Promise<ConsultantOption[]> {
  const { clusterId: companyId } = await requireClusterPermission(clusterId, ["employees.create", "employees.edit"]);

  try {
    const countryId = await findClusterCountryId(companyId);
    if (countryId === null) return [];

    const consultants = await prisma.consultants.findMany({
      where: { country_id: countryId, deleted_at: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return consultants.map((consultant) => ({ id: consultant.id.toString(), name: consultant.name }));
  } catch (error) {
    console.error("getConsultantOptions failed", { clusterId: companyId.toString(), error });
    throw new Error("Could not load consultants.");
  }
}

async function hashPassword(password: string) {
  return toLaravelBcrypt(await bcrypt.hash(password, BCRYPT_ROUNDS));
}

function isUniqueEmailError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function requireManageCluster(clusterId: string, permission: PermissionName): Promise<bigint | null> {
  try {
    const { clusterId: companyId } = await requireClusterPermission(clusterId, permission);
    return companyId;
  } catch {
    return null;
  }
}

// Legacy employees may keep a consultant from another country, so an unchanged consultant is always accepted.
async function validateEmployeeInput(
  input: EmployeeFormInput,
  companyId: bigint,
  currentConsultantId: bigint | null,
): Promise<ActionResult<{ name: string; email: string; consultant_id: bigint | null }>> {
  const parsed = employeeFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const consultantId = parsed.data.consultantId ? BigInt(parsed.data.consultantId) : null;
  if (consultantId !== null && consultantId !== currentConsultantId) {
    const countryId = await findClusterCountryId(companyId);
    const consultant =
      countryId === null
        ? null
        : await prisma.consultants.findFirst({
            where: { id: consultantId, country_id: countryId, deleted_at: null },
            select: { id: true },
          });
    if (!consultant) return { ok: false, error: "The selected consultant isn't available for this cluster." };
  }

  return {
    ok: true,
    data: { name: parsed.data.name, email: parsed.data.email, consultant_id: consultantId },
  };
}

export async function createEmployee(clusterId: string, input: EmployeeCreateInput): Promise<ActionResult<{ id: string }>> {
  const companyId = await requireManageCluster(clusterId, "employees.create");
  if (companyId === null) return { ok: false, error: "You don't have permission to add employees in this cluster." };

  const parsed = employeeCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  try {
    const validated = await validateEmployeeInput(parsed.data.employee, companyId, null);
    if (!validated.ok) return validated;

    const now = new Date();
    const employee = await prisma.employees.create({
      data: {
        ...validated.data,
        intermediano_company_id: companyId,
        password: await hashPassword(parsed.data.password),
        created_at: now,
        updated_at: now,
      },
      select: { id: true },
    });
    return { ok: true, data: { id: employee.id.toString() } };
  } catch (error) {
    if (isUniqueEmailError(error)) return { ok: false, error: "Another employee already uses this email." };
    console.error("createEmployee failed", { clusterId: companyId.toString(), error });
    return { ok: false, error: "Could not add this employee. Try again." };
  }
}

export async function updateEmployee(
  clusterId: string,
  employeeId: string,
  input: EmployeeFormInput,
): Promise<ActionResult<{ id: string }>> {
  const companyId = await requireManageCluster(clusterId, "employees.edit");
  if (companyId === null) return { ok: false, error: "You don't have permission to edit employees in this cluster." };

  const parsedId = employeeIdSchema.safeParse(employeeId);
  if (!parsedId.success) return { ok: false, error: "Unknown employee." };

  try {
    const where = { id: BigInt(parsedId.data), intermediano_company_id: companyId, deleted_at: null };
    const existing = await prisma.employees.findFirst({ where, select: { consultant_id: true } });
    if (!existing) return { ok: false, error: "This employee no longer exists in this cluster." };

    const validated = await validateEmployeeInput(input, companyId, existing.consultant_id);
    if (!validated.ok) return validated;

    const result = await prisma.employees.updateMany({
      where,
      data: { ...validated.data, updated_at: new Date() },
    });
    if (result.count === 0) return { ok: false, error: "This employee no longer exists in this cluster." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    if (isUniqueEmailError(error)) return { ok: false, error: "Another employee already uses this email." };
    console.error("updateEmployee failed", { clusterId: companyId.toString(), employeeId: parsedId.data, error });
    return { ok: false, error: "Could not save this employee. Try again." };
  }
}

// No email is sent; the admin shares the new password with the employee themselves.
export async function resetEmployeePassword(
  clusterId: string,
  employeeId: string,
  input: PasswordResetInput,
): Promise<ActionResult<{ id: string }>> {
  const companyId = await requireManageCluster(clusterId, "employees.edit");
  if (companyId === null) return { ok: false, error: "You don't have permission to reset passwords in this cluster." };

  const parsedId = employeeIdSchema.safeParse(employeeId);
  if (!parsedId.success) return { ok: false, error: "Unknown employee." };

  const parsed = passwordResetSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  try {
    const result = await prisma.employees.updateMany({
      where: { id: BigInt(parsedId.data), intermediano_company_id: companyId, deleted_at: null },
      data: { password: await hashPassword(parsed.data.password), updated_at: new Date() },
    });
    if (result.count === 0) return { ok: false, error: "This employee no longer exists in this cluster." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("resetEmployeePassword failed", { clusterId: companyId.toString(), employeeId: parsedId.data, error });
    return { ok: false, error: "Could not reset the password. Try again." };
  }
}

export async function archiveEmployee(clusterId: string, employeeId: string): Promise<ActionResult<{ id: string }>> {
  const companyId = await requireManageCluster(clusterId, "employees.delete");
  if (companyId === null) return { ok: false, error: "You don't have permission to archive employees in this cluster." };

  const parsedId = employeeIdSchema.safeParse(employeeId);
  if (!parsedId.success) return { ok: false, error: "Unknown employee." };

  try {
    const now = new Date();
    const result = await prisma.employees.updateMany({
      where: { id: BigInt(parsedId.data), intermediano_company_id: companyId, deleted_at: null },
      data: { deleted_at: now, updated_at: now },
    });
    if (result.count === 0) return { ok: false, error: "This employee is already archived." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("archiveEmployee failed", { clusterId: companyId.toString(), employeeId: parsedId.data, error });
    return { ok: false, error: "Could not archive this employee. Try again." };
  }
}
