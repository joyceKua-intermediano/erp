"use server";

import type { ActionResult } from "@/lib/action-result";
import { requireCustomerSession } from "@/lib/customer-auth";
import { customerTimesheetsWhere } from "@/lib/customer-portal";
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
  findTimesheetDetail,
  pendingTimesheetWhere,
  scopedTimesheetListWhere,
  timesheetSelect,
  toTimesheetListItem,
} from "@/lib/timesheets/records";

export async function getCustomerTimesheets(query?: TimesheetListQuery): Promise<ClusterTimesheets> {
  const { companyId } = await requireCustomerSession();
  const listQuery = timesheetListQuerySchema.parse(query ?? {});

  try {
    const scope = customerTimesheetsWhere(companyId);
    const where = scopedTimesheetListWhere(scope, listQuery);
    const [timesheets, total, scopeTotal, pending, employees] = await Promise.all([
      prisma.monthly_timesheets.findMany({
        where,
        orderBy: [{ year: "desc" }, { month: "desc" }, { id: "desc" }],
        select: timesheetSelect,
        ...pageArgs(listQuery.page),
      }),
      prisma.monthly_timesheets.count({ where }),
      prisma.monthly_timesheets.count({ where: scope }),
      prisma.monthly_timesheets.count({ where: { AND: [scope, pendingTimesheetWhere] } }),
      prisma.monthly_timesheets.groupBy({ by: ["employee_id"], where: scope }),
    ]);
    return {
      timesheets: timesheets.map(toTimesheetListItem),
      total,
      stats: { timesheets: scopeTotal, pending, employees: employees.length },
    };
  } catch (error) {
    console.error("getCustomerTimesheets failed", { companyId: companyId.toString(), error });
    throw new Error("Could not load your team's timesheets.");
  }
}

export async function getCustomerTimesheet(timesheetId: string): Promise<TimesheetDetail | null> {
  const { companyId } = await requireCustomerSession();

  const parsedId = timesheetIdSchema.safeParse(timesheetId);
  if (!parsedId.success) return null;

  try {
    return await findTimesheetDetail({ id: BigInt(parsedId.data), ...customerTimesheetsWhere(companyId) });
  } catch (error) {
    console.error("getCustomerTimesheet failed", { companyId: companyId.toString(), timesheetId: parsedId.data, error });
    throw new Error("Could not load this timesheet.");
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

// Like legacy, only the review fields change and a timesheet can be reviewed again.
export async function reviewCustomerTimesheet(
  timesheetId: string,
  input: TimesheetReviewInput,
): Promise<ActionResult<{ id: string; status: TimesheetStatus }>> {
  const companyId = await requireCustomerCompanyId();
  if (companyId === null) return { ok: false, error: "Your session has expired. Sign in again." };

  const parsedId = timesheetIdSchema.safeParse(timesheetId);
  if (!parsedId.success) return { ok: false, error: "Unknown timesheet." };

  const parsed = timesheetReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the review and try again." };
  }
  const { status, comment } = parsed.data;

  try {
    const result = await prisma.monthly_timesheets.updateMany({
      where: { id: BigInt(parsedId.data), ...customerTimesheetsWhere(companyId) },
      data: { status, comment: comment || null, updated_at: new Date() },
    });
    if (result.count === 0) return { ok: false, error: "This timesheet no longer exists." };

    return { ok: true, data: { id: parsedId.data, status } };
  } catch (error) {
    console.error("reviewCustomerTimesheet failed", { companyId: companyId.toString(), timesheetId: parsedId.data, error });
    return { ok: false, error: "Could not save this review. Try again." };
  }
}
