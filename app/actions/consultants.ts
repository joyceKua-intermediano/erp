"use server";

import type { ActionResult } from "@/lib/action-result";
import { requirePermission } from "@/lib/auth";
import { clusterIdFilter, type ClusterScope } from "@/lib/clusters";
import {
  consultantFormSchema,
  consultantIdSchema,
  type Consultant,
  type ConsultantFormInput,
} from "@/lib/consultants";
import { Prisma } from "@/lib/generated/prisma/client";
import type { CountryOption } from "@/lib/intermediano-companies";
import { prisma } from "@/lib/prisma";

// Consultants are shared across clusters, but the employee count only covers clusters the user can see.
function consultantSelect(scope: ClusterScope) {
  return {
    id: true,
    name: true,
    country_id: true,
    email: true,
    mobile_number: true,
    address: true,
    employer: true,
    date_of_birth: true,
    created_at: true,
    countries: { select: { name: true } },
    _count: {
      select: {
        employees: { where: { deleted_at: null, intermediano_company_id: clusterIdFilter(scope) } },
      },
    },
  } satisfies Prisma.consultantsSelect;
}

type ConsultantRow = Prisma.consultantsGetPayload<{ select: ReturnType<typeof consultantSelect> }>;

function toConsultant(consultant: ConsultantRow): Consultant {
  return {
    id: consultant.id.toString(),
    name: consultant.name,
    countryId: consultant.country_id.toString(),
    countryName: consultant.countries.name,
    email: consultant.email,
    mobileNumber: consultant.mobile_number,
    address: consultant.address,
    employer: consultant.employer,
    dateOfBirth: consultant.date_of_birth?.toISOString().slice(0, 10) ?? null,
    employeeCount: consultant._count.employees,
    createdAt: consultant.created_at?.toISOString() ?? null,
  };
}

export async function getConsultants(): Promise<Consultant[]> {
  const session = await requirePermission("consultants.view");

  try {
    const consultants = await prisma.consultants.findMany({
      where: { deleted_at: null },
      orderBy: { name: "asc" },
      select: consultantSelect(session.user.clusters),
    });
    return consultants.map(toConsultant);
  } catch (error) {
    console.error("getConsultants failed", { error });
    throw new Error("Could not load consultants.");
  }
}

export async function getConsultant(consultantId: string): Promise<Consultant | null> {
  const session = await requirePermission("consultants.view");

  const parsedId = consultantIdSchema.safeParse(consultantId);
  if (!parsedId.success) return null;

  try {
    const consultant = await prisma.consultants.findFirst({
      where: { id: BigInt(parsedId.data), deleted_at: null },
      select: consultantSelect(session.user.clusters),
    });
    return consultant ? toConsultant(consultant) : null;
  } catch (error) {
    console.error("getConsultant failed", { consultantId: parsedId.data, error });
    throw new Error("Could not load this consultant.");
  }
}

export async function getConsultantCountryOptions(): Promise<CountryOption[]> {
  await requirePermission("consultants.view");

  try {
    const countries = await prisma.countries.findMany({
      where: { deleted_at: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return countries.map((country) => ({ id: country.id.toString(), name: country.name }));
  } catch (error) {
    console.error("getConsultantCountryOptions failed", { error });
    throw new Error("Could not load countries.");
  }
}

async function canManageConsultants() {
  try {
    await requirePermission("consultants.manage");
    return true;
  } catch {
    return false;
  }
}

function isUniqueNameError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function emptyToNull(value: string) {
  return value === "" ? null : value;
}

async function validateConsultantInput(
  input: ConsultantFormInput,
): Promise<ActionResult<Prisma.consultantsUncheckedCreateInput>> {
  const parsed = consultantFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const countryId = BigInt(parsed.data.countryId);
  const country = await prisma.countries.findFirst({ where: { id: countryId, deleted_at: null }, select: { id: true } });
  if (!country) return { ok: false, error: "The selected country no longer exists." };

  return {
    ok: true,
    data: {
      name: parsed.data.name,
      country_id: countryId,
      employer: emptyToNull(parsed.data.employer),
      date_of_birth: parsed.data.dateOfBirth ? new Date(`${parsed.data.dateOfBirth}T00:00:00Z`) : null,
      email: emptyToNull(parsed.data.email),
      mobile_number: emptyToNull(parsed.data.mobileNumber),
      address: emptyToNull(parsed.data.address),
    },
  };
}

// The name index also covers archived consultants, so an archived name can't be reused.
const DUPLICATE_NAME_ERROR = "A consultant with this name already exists, possibly archived.";

export async function createConsultant(input: ConsultantFormInput): Promise<ActionResult<{ id: string }>> {
  if (!(await canManageConsultants())) {
    return { ok: false, error: "You don't have permission to add consultants." };
  }

  try {
    const validated = await validateConsultantInput(input);
    if (!validated.ok) return validated;

    const now = new Date();
    const consultant = await prisma.consultants.create({
      data: { ...validated.data, created_at: now, updated_at: now },
      select: { id: true },
    });
    return { ok: true, data: { id: consultant.id.toString() } };
  } catch (error) {
    if (isUniqueNameError(error)) return { ok: false, error: DUPLICATE_NAME_ERROR };
    console.error("createConsultant failed", { error });
    return { ok: false, error: "Could not add this consultant. Try again." };
  }
}

export async function updateConsultant(
  consultantId: string,
  input: ConsultantFormInput,
): Promise<ActionResult<{ id: string }>> {
  if (!(await canManageConsultants())) {
    return { ok: false, error: "You don't have permission to edit consultants." };
  }

  const parsedId = consultantIdSchema.safeParse(consultantId);
  if (!parsedId.success) return { ok: false, error: "Unknown consultant." };

  try {
    const validated = await validateConsultantInput(input);
    if (!validated.ok) return validated;

    const result = await prisma.consultants.updateMany({
      where: { id: BigInt(parsedId.data), deleted_at: null },
      data: { ...validated.data, updated_at: new Date() },
    });
    if (result.count === 0) return { ok: false, error: "This consultant no longer exists." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    if (isUniqueNameError(error)) return { ok: false, error: DUPLICATE_NAME_ERROR };
    console.error("updateConsultant failed", { consultantId: parsedId.data, error });
    return { ok: false, error: "Could not save this consultant. Try again." };
  }
}

export async function archiveConsultant(consultantId: string): Promise<ActionResult<{ id: string }>> {
  if (!(await canManageConsultants())) {
    return { ok: false, error: "You don't have permission to archive consultants." };
  }

  const parsedId = consultantIdSchema.safeParse(consultantId);
  if (!parsedId.success) return { ok: false, error: "Unknown consultant." };

  try {
    const now = new Date();
    const result = await prisma.consultants.updateMany({
      where: { id: BigInt(parsedId.data), deleted_at: null },
      data: { deleted_at: now, updated_at: now },
    });
    if (result.count === 0) return { ok: false, error: "This consultant is already archived." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("archiveConsultant failed", { consultantId: parsedId.data, error });
    return { ok: false, error: "Could not archive this consultant. Try again." };
  }
}
