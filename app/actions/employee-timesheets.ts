"use server";

import type { ActionResult } from "@/lib/action-result";
import { requireEmployeeSession } from "@/lib/employee-auth";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  formatPeriod,
  sumHours,
  timesheetFormSchema,
  timesheetIdSchema,
  timesheetUpdateSchema,
  toStoredDays,
  type MyTimesheets,
  type TimesheetDetail,
  type TimesheetFormInput,
} from "@/lib/timesheets";
import {
  findEmployeeContractCompany,
  findEmployeeTimesheetsCluster,
  findTimesheetDetail,
  timesheetSelect,
  toTimesheetListItem,
} from "@/lib/timesheets/records";

// The employee always comes from the session, never from the request, so employees only touch their own timesheets.

export async function getMyTimesheets(): Promise<MyTimesheets> {
  const { employeeId } = await requireEmployeeSession();

  try {
    const [timesheets, contractCompany, timesheetsCluster] = await Promise.all([
      prisma.monthly_timesheets.findMany({
        where: { employee_id: employeeId },
        orderBy: [{ year: "desc" }, { month: "desc" }, { id: "desc" }],
        select: timesheetSelect,
      }),
      findEmployeeContractCompany(employeeId),
      findEmployeeTimesheetsCluster(employeeId),
    ]);
    return {
      timesheets: timesheets.map(toTimesheetListItem),
      customerName: contractCompany?.companyName ?? null,
      hasContract: contractCompany !== null,
      timesheetsEnabled: timesheetsCluster !== null,
    };
  } catch (error) {
    console.error("getMyTimesheets failed", { employeeId: employeeId.toString(), error });
    throw new Error("Could not load your timesheets.");
  }
}

export async function getMyTimesheet(timesheetId: string): Promise<TimesheetDetail | null> {
  const { employeeId } = await requireEmployeeSession();

  const parsedId = timesheetIdSchema.safeParse(timesheetId);
  if (!parsedId.success) return null;

  try {
    return await findTimesheetDetail({ id: BigInt(parsedId.data), employee_id: employeeId });
  } catch (error) {
    console.error("getMyTimesheet failed", { employeeId: employeeId.toString(), timesheetId: parsedId.data, error });
    throw new Error("Could not load this timesheet.");
  }
}

async function requireEmployeeId(): Promise<bigint | null> {
  try {
    const { employeeId } = await requireEmployeeSession();
    return employeeId;
  } catch {
    return null;
  }
}

function isUniquePeriodError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function duplicatePeriodError(year: number, month: number) {
  return `You already have a timesheet for ${formatPeriod(year, month)}. Open it from the list to edit it.`;
}

const TIMESHEETS_DISABLED_ERROR = "Timesheets aren't available for your entity. Contact HR if this looks wrong.";

export async function createMyTimesheet(input: TimesheetFormInput): Promise<ActionResult<{ id: string }>> {
  const employeeId = await requireEmployeeId();
  if (employeeId === null) return { ok: false, error: "Your session has expired. Sign in again." };

  const parsed = timesheetFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the timesheet and try again." };
  }
  const { year, month, days } = parsed.data;

  try {
    const timesheetsCluster = await findEmployeeTimesheetsCluster(employeeId);
    if (timesheetsCluster === null) return { ok: false, error: TIMESHEETS_DISABLED_ERROR };

    const contractCompany = await findEmployeeContractCompany(employeeId);
    if (!contractCompany) {
      return { ok: false, error: "You don't have an active contract yet. Contact HR." };
    }

    const existing = await prisma.monthly_timesheets.findFirst({
      where: { employee_id: employeeId, year, month },
      select: { id: true },
    });
    if (existing) return { ok: false, error: duplicatePeriodError(year, month) };

    const now = new Date();
    const created = await prisma.monthly_timesheets.create({
      data: {
        employee_id: employeeId,
        company_id: contractCompany.companyId,
        intermediano_company_id: timesheetsCluster,
        year,
        month,
        days: toStoredDays(days),
        total_hours: sumHours(days),
        status: "pending",
        created_at: now,
        updated_at: now,
      },
      select: { id: true },
    });
    return { ok: true, data: { id: created.id.toString() } };
  } catch (error) {
    if (isUniquePeriodError(error)) return { ok: false, error: duplicatePeriodError(year, month) };
    console.error("createMyTimesheet failed", { employeeId: employeeId.toString(), error });
    return { ok: false, error: "Could not submit this timesheet. Try again." };
  }
}

// The period stays fixed and the reviewer's comment is kept; saving sends the timesheet back for review.
export async function updateMyTimesheet(
  timesheetId: string,
  input: TimesheetFormInput,
): Promise<ActionResult<{ id: string }>> {
  const employeeId = await requireEmployeeId();
  if (employeeId === null) return { ok: false, error: "Your session has expired. Sign in again." };

  const parsedId = timesheetIdSchema.safeParse(timesheetId);
  if (!parsedId.success) return { ok: false, error: "Unknown timesheet." };

  try {
    if ((await findEmployeeTimesheetsCluster(employeeId)) === null) {
      return { ok: false, error: TIMESHEETS_DISABLED_ERROR };
    }

    const id = BigInt(parsedId.data);
    const existing = await prisma.monthly_timesheets.findFirst({
      where: { id, employee_id: employeeId },
      select: { year: true, month: true, status: true },
    });
    if (!existing) return { ok: false, error: "This timesheet no longer exists." };
    if (existing.status === "approved") {
      return { ok: false, error: "This timesheet has been approved and can't be changed." };
    }

    const parsed = timesheetUpdateSchema.safeParse({ ...input, year: existing.year, month: existing.month });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the timesheet and try again." };
    }
    const { days } = parsed.data;

    const result = await prisma.monthly_timesheets.updateMany({
      where: { id, employee_id: employeeId, OR: [{ status: null }, { status: { not: "approved" } }] },
      data: { days: toStoredDays(days), total_hours: sumHours(days), status: "pending", updated_at: new Date() },
    });
    if (result.count === 0) {
      return { ok: false, error: "This timesheet was approved in the meantime and can't be changed." };
    }

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("updateMyTimesheet failed", { employeeId: employeeId.toString(), timesheetId: parsedId.data, error });
    return { ok: false, error: "Could not save this timesheet. Try again." };
  }
}
