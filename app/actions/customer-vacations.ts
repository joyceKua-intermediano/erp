"use server";

import type { ActionResult } from "@/lib/action-result";
import { requireCustomerSession } from "@/lib/customer-auth";
import { customerVacationsWhere } from "@/lib/customer-portal";
import { pageArgs } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import {
  vacationListQuerySchema,
  vacationRequestIdSchema,
  vacationReviewSchema,
  type ClusterVacationRequests,
  type VacationListQuery,
  type VacationReviewInput,
  type VacationStatus,
} from "@/lib/vacations";
import {
  pendingVacationWhere,
  scopedVacationListWhere,
  toVacationRequestItem,
  vacationSelect,
} from "@/lib/vacations/records";

export async function getCustomerVacationRequests(query?: VacationListQuery): Promise<ClusterVacationRequests> {
  const { companyId } = await requireCustomerSession();
  const listQuery = vacationListQuerySchema.parse(query ?? {});

  try {
    const scope = customerVacationsWhere(companyId);
    const where = scopedVacationListWhere(scope, listQuery);
    const [requests, total, scopeTotal, pending, employees] = await Promise.all([
      prisma.vacation_requests.findMany({
        where,
        orderBy: [{ start_date: "desc" }, { id: "desc" }],
        select: vacationSelect,
        ...pageArgs(listQuery.page),
      }),
      prisma.vacation_requests.count({ where }),
      prisma.vacation_requests.count({ where: scope }),
      prisma.vacation_requests.count({ where: { AND: [scope, pendingVacationWhere] } }),
      prisma.vacation_requests.groupBy({ by: ["employee_id"], where: scope }),
    ]);
    return {
      requests: requests.map(toVacationRequestItem),
      total,
      stats: { requests: scopeTotal, pending, employees: employees.length },
    };
  } catch (error) {
    console.error("getCustomerVacationRequests failed", { companyId: companyId.toString(), error });
    throw new Error("Could not load your team's vacation requests.");
  }
}

async function requireCustomerCompanyId(): Promise<bigint | null> {
  try {
    const { companyId } = await requireCustomerSession();
    return companyId;
  } catch {
    return null;
  }
}

// Like legacy, only pending requests can be reviewed and the decision is final.
export async function reviewCustomerVacationRequest(
  requestId: string,
  input: VacationReviewInput,
): Promise<ActionResult<{ id: string; status: VacationStatus }>> {
  const companyId = await requireCustomerCompanyId();
  if (companyId === null) return { ok: false, error: "Your session has expired. Sign in again." };

  const parsedId = vacationRequestIdSchema.safeParse(requestId);
  if (!parsedId.success) return { ok: false, error: "Unknown vacation request." };

  const parsed = vacationReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the review and try again." };
  }
  const { status } = parsed.data;

  try {
    const result = await prisma.vacation_requests.updateMany({
      where: { id: BigInt(parsedId.data), AND: [customerVacationsWhere(companyId), pendingVacationWhere] },
      data: { status, updated_at: new Date() },
    });
    if (result.count === 0) return { ok: false, error: "This request was already reviewed or no longer exists." };

    return { ok: true, data: { id: parsedId.data, status } };
  } catch (error) {
    console.error("reviewCustomerVacationRequest failed", {
      companyId: companyId.toString(),
      requestId: parsedId.data,
      error,
    });
    return { ok: false, error: "Could not save this review. Try again." };
  }
}
