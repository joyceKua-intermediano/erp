"use server";

import type { ActionResult } from "@/lib/action-result";
import { deriveContractStatus, isSigned, toContractKind } from "@/lib/contracts";
import { requireEmployeeSession } from "@/lib/employee-auth";
import {
  documentsFormSchema,
  profileFormSchema,
  type DocumentsFormInput,
  type EmployeeDocuments,
  type EmployeeProfile,
  type MyContract,
  type ProfileFormInput,
} from "@/lib/employee-profile";
import {
  employeeContractsWhere,
  loadEmployeeDocuments,
  loadEmployeeProfile,
  saveEmployeeDocuments,
  saveEmployeeProfile,
} from "@/lib/employee-profile/records";
import { prisma } from "@/lib/prisma";

// The employee always comes from the session, never from the request, so employees only touch their own records.

const SESSION_EXPIRED_ERROR = "Your session has expired. Sign in again.";

async function requireEmployeeId(): Promise<bigint | null> {
  try {
    const { employeeId } = await requireEmployeeSession();
    return employeeId;
  } catch {
    return null;
  }
}

function toIsoDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

export async function getMyProfile(): Promise<EmployeeProfile> {
  const { employeeId } = await requireEmployeeSession();

  try {
    return await loadEmployeeProfile(employeeId);
  } catch (error) {
    console.error("getMyProfile failed", { employeeId: employeeId.toString(), error });
    throw new Error("Could not load your profile.");
  }
}

export async function saveMyProfile(input: ProfileFormInput): Promise<ActionResult<null>> {
  const employeeId = await requireEmployeeId();
  if (employeeId === null) return { ok: false, error: SESSION_EXPIRED_ERROR };

  const parsed = profileFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your profile and try again." };
  }

  try {
    await saveEmployeeProfile(employeeId, parsed.data);
    return { ok: true, data: null };
  } catch (error) {
    console.error("saveMyProfile failed", { employeeId: employeeId.toString(), error });
    return { ok: false, error: "Could not save your profile. Try again." };
  }
}

export async function getMyDocuments(): Promise<EmployeeDocuments> {
  const { employeeId } = await requireEmployeeSession();

  try {
    return await loadEmployeeDocuments(employeeId);
  } catch (error) {
    console.error("getMyDocuments failed", { employeeId: employeeId.toString(), error });
    throw new Error("Could not load your documents.");
  }
}

export async function saveMyDocuments(input: DocumentsFormInput): Promise<ActionResult<null>> {
  const employeeId = await requireEmployeeId();
  if (employeeId === null) return { ok: false, error: SESSION_EXPIRED_ERROR };

  const parsed = documentsFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your documents and try again." };
  }

  try {
    return await saveEmployeeDocuments(employeeId, parsed.data);
  } catch (error) {
    console.error("saveMyDocuments failed", { employeeId: employeeId.toString(), error });
    return { ok: false, error: "Could not save your documents. Try again." };
  }
}

export async function getMyContracts(): Promise<MyContract[]> {
  const { employeeId } = await requireEmployeeSession();

  try {
    const rows = await prisma.contracts.findMany({
      where: employeeContractsWhere(employeeId),
      orderBy: [{ start_date: "desc" }, { id: "desc" }],
      select: {
        id: true,
        contract_type: true,
        job_title: true,
        country_work: true,
        start_date: true,
        end_date: true,
        signature: true,
        admin_signature: true,
        template_id: true,
        companies: { select: { name: true } },
        countries: { select: { name: true } },
        intermediano_companies: { select: { name: true } },
      },
    });

    const now = new Date();
    return rows.map((contract) => ({
      id: contract.id.toString(),
      kind: toContractKind(contract.contract_type),
      jobTitle: contract.job_title,
      clientName: contract.companies?.name ?? null,
      clusterName: contract.intermediano_companies?.name ?? null,
      countryOfWork: contract.countries?.name ?? contract.country_work,
      startDate: toIsoDate(contract.start_date),
      endDate: toIsoDate(contract.end_date),
      status: deriveContractStatus(contract, now),
      employeeSigned: isSigned(contract.signature),
      adminSigned: isSigned(contract.admin_signature),
      hasTemplate: contract.template_id !== null,
    }));
  } catch (error) {
    console.error("getMyContracts failed", { employeeId: employeeId.toString(), error });
    throw new Error("Could not load your contracts.");
  }
}
