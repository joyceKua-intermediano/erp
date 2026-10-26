"use server";

import { randomBytes } from "node:crypto";
import type { ActionResult } from "@/lib/action-result";
import { requireClusterPermission } from "@/lib/auth";
import { deriveContractStatus } from "@/lib/contracts";
import {
  employeeFormSchema,
  employeeIdSchema,
  type ClusterEmployee,
  type ConsultantOption,
  type EmployeeDetail,
  type EmployeeFormInput,
} from "@/lib/employees";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

function toIsoDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

export async function getClusterEmployees(clusterId: string): Promise<ClusterEmployee[]> {
  const { clusterId: companyId } = await requireClusterPermission(clusterId, "employees.view");

  const clusterContracts = {
    intermediano_company_id: companyId,
    deleted_at: null,
  };

  try {
    const employees = await prisma.employees.findMany({
      where: {
        deleted_at: null,
        intermediano_company_id: companyId,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        consultants: { select: { name: true } },
        contracts: {
          where: clusterContracts,
          orderBy: [{ start_date: "desc" }, { id: "desc" }],
          take: 1,
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
    });

    const now = new Date();

    return employees.map((employee) => {
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
    });
  } catch (error) {
    console.error("getClusterEmployees failed", { clusterId: companyId.toString(), error });
    throw new Error("Could not load employees for this cluster.");
  }
}

export async function getEmployee(clusterId: string, employeeId: string): Promise<EmployeeDetail | null> {
  const { clusterId: companyId } = await requireClusterPermission(clusterId, "employees.view");

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

async function findClusterCountryId(companyId: bigint) {
  const company = await prisma.intermediano_companies.findFirst({
    where: { id: companyId, deleted_at: null },
    select: { country_id: true },
  });
  return company?.country_id ?? null;
}

export async function getConsultantOptions(clusterId: string): Promise<ConsultantOption[]> {
  const { clusterId: companyId } = await requireClusterPermission(clusterId, "employees.manage");

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

// Employees sign in to the portal later through an invite, so the NOT NULL password column gets a value no password can match.
function unusablePassword() {
  return `invite-pending:${randomBytes(24).toString("hex")}`;
}

function isUniqueEmailError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function requireManageCluster(clusterId: string): Promise<bigint | null> {
  try {
    const { clusterId: companyId } = await requireClusterPermission(clusterId, "employees.manage");
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

export async function createEmployee(clusterId: string, input: EmployeeFormInput): Promise<ActionResult<{ id: string }>> {
  const companyId = await requireManageCluster(clusterId);
  if (companyId === null) return { ok: false, error: "You don't have permission to add employees in this cluster." };

  try {
    const validated = await validateEmployeeInput(input, companyId, null);
    if (!validated.ok) return validated;

    const now = new Date();
    const employee = await prisma.employees.create({
      data: {
        ...validated.data,
        intermediano_company_id: companyId,
        password: unusablePassword(),
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
  const companyId = await requireManageCluster(clusterId);
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

export async function archiveEmployee(clusterId: string, employeeId: string): Promise<ActionResult<{ id: string }>> {
  const companyId = await requireManageCluster(clusterId);
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
