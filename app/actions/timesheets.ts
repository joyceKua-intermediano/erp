"use server";

import type { ActionResult } from "@/lib/action-result";
import { requireClusterPermission } from "@/lib/auth";
import { pageArgs } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import {
  timesheetIdSchema,
  timesheetListQuerySchema,
  timesheetReviewSchema,
  type ClusterTimesheets,
  type TimesheetDetail,
  type TimesheetListQuery,
  type TimesheetReviewInput,
  type TimesheetStatus,
} from "@/lib/timesheets";
import {
  clusterTimesheetsWhere,
  findClusterTimesheet,
  pendingTimesheetWhere,
  timesheetListWhere,
  timesheetSelect,
  toTimesheetListItem,
} from "@/lib/timesheets/records";

export async function getClusterTimesheets(clusterId: string, query?: TimesheetListQuery): Promise<ClusterTimesheets> {
  const { clusterId: companyId } = await requireClusterPermission(clusterId, "timesheets.view");
  const listQuery = timesheetListQuerySchema.parse(query ?? {});

  try {
    const clusterWhere = clusterTimesheetsWhere(companyId);
    const where = timesheetListWhere(companyId, listQuery);
    const [timesheets, total, clusterTotal, pending, employees] = await Promise.all([
      prisma.monthly_timesheets.findMany({
        where,
        orderBy: [{ year: "desc" }, { month: "desc" }, { id: "desc" }],
        select: timesheetSelect,
        ...pageArgs(listQuery.page),
      }),
      prisma.monthly_timesheets.count({ where }),
      prisma.monthly_timesheets.count({ where: clusterWhere }),
      prisma.monthly_timesheets.count({ where: { AND: [clusterWhere, pendingTimesheetWhere] } }),
      prisma.monthly_timesheets.groupBy({ by: ["employee_id"], where: clusterWhere }),
    ]);
    return {
      timesheets: timesheets.map(toTimesheetListItem),
      total,
      stats: { timesheets: clusterTotal, pending, employees: employees.length },
    };
  } catch (error) {
    console.error("getClusterTimesheets failed", { clusterId: companyId.toString(), error });
    throw new Error("Could not load timesheets for this cluster.");
  }
}

export async function getTimesheet(clusterId: string, timesheetId: string): Promise<TimesheetDetail | null> {
  const { clusterId: companyId } = await requireClusterPermission(clusterId, "timesheets.view");

  const parsedId = timesheetIdSchema.safeParse(timesheetId);
  if (!parsedId.success) return null;

  try {
    return await findClusterTimesheet(companyId, BigInt(parsedId.data));
  } catch (error) {
    console.error("getTimesheet failed", { clusterId: companyId.toString(), timesheetId: parsedId.data, error });
    throw new Error("Could not load this timesheet.");
  }
}

async function requireManageCluster(clusterId: string): Promise<bigint | null> {
  try {
    const { clusterId: companyId } = await requireClusterPermission(clusterId, "timesheets.manage");
    return companyId;
  } catch {
    return null;
  }
}

// Only the review fields change; days and total_hours stay exactly as the employee submitted them.
export async function reviewTimesheet(
  clusterId: string,
  timesheetId: string,
  input: TimesheetReviewInput,
): Promise<ActionResult<{ id: string; status: TimesheetStatus }>> {
  const companyId = await requireManageCluster(clusterId);
  if (companyId === null) return { ok: false, error: "You don't have permission to review timesheets in this cluster." };

  const parsedId = timesheetIdSchema.safeParse(timesheetId);
  if (!parsedId.success) return { ok: false, error: "Unknown timesheet." };

  const parsed = timesheetReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the review and try again." };
  }
  const { status, comment } = parsed.data;

  try {
    const result = await prisma.monthly_timesheets.updateMany({
      where: { id: BigInt(parsedId.data), ...clusterTimesheetsWhere(companyId) },
      data: { status, comment: comment || null, updated_at: new Date() },
    });
    if (result.count === 0) return { ok: false, error: "This timesheet no longer exists in this cluster." };

    return { ok: true, data: { id: parsedId.data, status } };
  } catch (error) {
    console.error("reviewTimesheet failed", { clusterId: companyId.toString(), timesheetId: parsedId.data, error });
    return { ok: false, error: "Could not save this review. Try again." };
  }
}
