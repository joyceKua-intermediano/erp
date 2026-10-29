"use server";

import type { ActionResult } from "@/lib/action-result";
import { requireClusterPermission } from "@/lib/auth";
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
  clusterVacationsWhere,
  pendingVacationWhere,
  toVacationRequestItem,
  vacationListWhere,
  vacationSelect,
} from "@/lib/vacations/records";

export async function getClusterVacationRequests(
  clusterId: string,
  query?: VacationListQuery,
): Promise<ClusterVacationRequests> {
  const { clusterId: companyId } = await requireClusterPermission(clusterId, "employees.view");
  const listQuery = vacationListQuerySchema.parse(query ?? {});

  try {
    const clusterWhere = clusterVacationsWhere(companyId);
    const where = vacationListWhere(companyId, listQuery);
    const [requests, total, clusterTotal, pending, employees] = await Promise.all([
      prisma.vacation_requests.findMany({
        where,
        orderBy: [{ start_date: "desc" }, { id: "desc" }],
        select: vacationSelect,
        ...pageArgs(listQuery.page),
      }),
      prisma.vacation_requests.count({ where }),
      prisma.vacation_requests.count({ where: clusterWhere }),
      prisma.vacation_requests.count({ where: { AND: [clusterWhere, pendingVacationWhere] } }),
      prisma.vacation_requests.groupBy({ by: ["employee_id"], where: clusterWhere }),
    ]);
    return {
      requests: requests.map(toVacationRequestItem),
      total,
      stats: { requests: clusterTotal, pending, employees: employees.length },
    };
  } catch (error) {
    console.error("getClusterVacationRequests failed", { clusterId: companyId.toString(), error });
    throw new Error("Could not load vacation requests for this cluster.");
  }
}

async function requireManageCluster(clusterId: string): Promise<bigint | null> {
  try {
    const { clusterId: companyId } = await requireClusterPermission(clusterId, "employees.manage");
    return companyId;
  } catch {
    return null;
  }
}

// Like legacy, only pending requests can be reviewed and the decision is final.
export async function reviewVacationRequest(
  clusterId: string,
  requestId: string,
  input: VacationReviewInput,
): Promise<ActionResult<{ id: string; status: VacationStatus }>> {
  const companyId = await requireManageCluster(clusterId);
  if (companyId === null) {
    return { ok: false, error: "You don't have permission to review vacation requests in this cluster." };
  }

  const parsedId = vacationRequestIdSchema.safeParse(requestId);
  if (!parsedId.success) return { ok: false, error: "Unknown vacation request." };

  const parsed = vacationReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the review and try again." };
  }
  const { status } = parsed.data;

  try {
    const result = await prisma.vacation_requests.updateMany({
      where: { id: BigInt(parsedId.data), AND: [clusterVacationsWhere(companyId), pendingVacationWhere] },
      data: { status, updated_at: new Date() },
    });
    if (result.count === 0) {
      return { ok: false, error: "This request was already reviewed or no longer exists in this cluster." };
    }

    return { ok: true, data: { id: parsedId.data, status } };
  } catch (error) {
    console.error("reviewVacationRequest failed", { clusterId: companyId.toString(), requestId: parsedId.data, error });
    return { ok: false, error: "Could not save this review. Try again." };
  }
}
