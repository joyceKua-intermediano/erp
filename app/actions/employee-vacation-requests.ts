"use server";

import type { ActionResult } from "@/lib/action-result";
import { requireEmployeeSession } from "@/lib/employee-auth";
import { prisma } from "@/lib/prisma";
import {
  accruedVacationDays,
  annualVacationDays,
  formatDays,
  formatVacationRange,
  parseDateValue,
  toDateValue,
  toVacationBalance,
  vacationFormSchema,
  vacationRequestIdSchema,
  type MyVacationRequests,
  type VacationFormInput,
  type VacationRequestItem,
} from "@/lib/vacations";
import {
  findEmployeeVacationContract,
  findHolidayDates,
  findOverlappingVacation,
  findVacationUsage,
  toVacationRequestItem,
  vacationSelect,
} from "@/lib/vacations/records";

// The employee always comes from the session, never from the request, so employees only touch their own requests.

export async function getMyVacationRequests(): Promise<MyVacationRequests> {
  const { employeeId } = await requireEmployeeSession();

  try {
    const [requests, contract, usage] = await Promise.all([
      prisma.vacation_requests.findMany({
        where: { employee_id: employeeId },
        orderBy: [{ start_date: "desc" }, { id: "desc" }],
        select: vacationSelect,
      }),
      findEmployeeVacationContract(employeeId),
      findVacationUsage(employeeId),
    ]);

    const year = new Date().getFullYear();
    const holidayDates = await findHolidayDates(contract?.countryId ?? null, [year - 1, year, year + 1]);
    const annualDays = annualVacationDays(contract?.countryName ?? null);

    return {
      requests: requests.map(toVacationRequestItem),
      balance: contract
        ? toVacationBalance(
            annualDays,
            accruedVacationDays(annualDays, contract.startDate, new Date()),
            usage.taken,
            usage.pending,
          )
        : null,
      customerName: contract?.companyName ?? null,
      holidayDates,
    };
  } catch (error) {
    console.error("getMyVacationRequests failed", { employeeId: employeeId.toString(), error });
    throw new Error("Could not load your vacation requests.");
  }
}

export async function getMyVacationRequest(requestId: string): Promise<VacationRequestItem | null> {
  const { employeeId } = await requireEmployeeSession();

  const parsedId = vacationRequestIdSchema.safeParse(requestId);
  if (!parsedId.success) return null;

  try {
    const row = await prisma.vacation_requests.findFirst({
      where: { id: BigInt(parsedId.data), employee_id: employeeId },
      select: vacationSelect,
    });
    return row ? toVacationRequestItem(row) : null;
  } catch (error) {
    console.error("getMyVacationRequest failed", { employeeId: employeeId.toString(), requestId: parsedId.data, error });
    throw new Error("Could not load this vacation request.");
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

const SESSION_EXPIRED_ERROR = "Your session has expired. Sign in again.";

type CheckedRequest = { startDate: Date; endDate: Date; numberOfDays: number; companyId: bigint };

// Shared by create and update: the form rules, the contract, overlapping dates and the remaining balance.
async function checkVacationRequest(
  employeeId: bigint,
  input: VacationFormInput,
  excludeId?: bigint,
): Promise<ActionResult<CheckedRequest>> {
  const parsed = vacationFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the request and try again." };
  }
  const startDate = parseDateValue(parsed.data.startDate);
  const endDate = parseDateValue(parsed.data.endDate);
  const { numberOfDays } = parsed.data;

  const contract = await findEmployeeVacationContract(employeeId);
  if (!contract) return { ok: false, error: "You need an employee contract before you can request vacation. Contact HR." };
  if (contract.companyId === null) {
    return { ok: false, error: "Your contract has no customer to review vacation requests yet. Contact HR." };
  }

  const overlap = await findOverlappingVacation(employeeId, startDate, endDate, excludeId);
  if (overlap) {
    const range = formatVacationRange(
      overlap.start_date ? toDateValue(overlap.start_date) : null,
      overlap.end_date ? toDateValue(overlap.end_date) : null,
    );
    return { ok: false, error: `These dates overlap your request for ${range}.` };
  }

  const annualDays = annualVacationDays(contract.countryName);
  const usage = await findVacationUsage(employeeId, excludeId);
  const balance = toVacationBalance(
    annualDays,
    accruedVacationDays(annualDays, contract.startDate, new Date()),
    usage.taken,
    usage.pending,
  );
  if (numberOfDays > balance.available) {
    return { ok: false, error: `You only have ${formatDays(balance.available)} available.` };
  }

  return { ok: true, data: { startDate, endDate, numberOfDays, companyId: contract.companyId } };
}

export async function createMyVacationRequest(input: VacationFormInput): Promise<ActionResult<{ id: string }>> {
  const employeeId = await requireEmployeeId();
  if (employeeId === null) return { ok: false, error: SESSION_EXPIRED_ERROR };

  try {
    const checked = await checkVacationRequest(employeeId, input);
    if (!checked.ok) return checked;
    const { startDate, endDate, numberOfDays, companyId } = checked.data;

    const now = new Date();
    const created = await prisma.vacation_requests.create({
      data: {
        employee_id: employeeId,
        company_id: companyId,
        start_date: startDate,
        end_date: endDate,
        number_of_days: String(numberOfDays),
        status: "pending",
        created_at: now,
        updated_at: now,
      },
      select: { id: true },
    });
    return { ok: true, data: { id: created.id.toString() } };
  } catch (error) {
    console.error("createMyVacationRequest failed", { employeeId: employeeId.toString(), error });
    return { ok: false, error: "Could not submit this request. Try again." };
  }
}

// Saving a rejected request sends it back for review; approved requests are locked.
export async function updateMyVacationRequest(
  requestId: string,
  input: VacationFormInput,
): Promise<ActionResult<{ id: string }>> {
  const employeeId = await requireEmployeeId();
  if (employeeId === null) return { ok: false, error: SESSION_EXPIRED_ERROR };

  const parsedId = vacationRequestIdSchema.safeParse(requestId);
  if (!parsedId.success) return { ok: false, error: "Unknown vacation request." };

  try {
    const id = BigInt(parsedId.data);
    const existing = await prisma.vacation_requests.findFirst({
      where: { id, employee_id: employeeId },
      select: { status: true },
    });
    if (!existing) return { ok: false, error: "This vacation request no longer exists." };
    if (existing.status === "approved") {
      return { ok: false, error: "This request has been approved and can't be changed." };
    }

    const checked = await checkVacationRequest(employeeId, input, id);
    if (!checked.ok) return checked;
    const { startDate, endDate, numberOfDays, companyId } = checked.data;

    const result = await prisma.vacation_requests.updateMany({
      where: { id, employee_id: employeeId, status: { not: "approved" } },
      data: {
        company_id: companyId,
        start_date: startDate,
        end_date: endDate,
        number_of_days: String(numberOfDays),
        status: "pending",
        updated_at: new Date(),
      },
    });
    if (result.count === 0) {
      return { ok: false, error: "This request was approved in the meantime and can't be changed." };
    }

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("updateMyVacationRequest failed", { employeeId: employeeId.toString(), requestId: parsedId.data, error });
    return { ok: false, error: "Could not save this request. Try again." };
  }
}

// Legacy lets employees delete their requests; approved ones stay so the balance keeps counting them.
export async function deleteMyVacationRequest(requestId: string): Promise<ActionResult<{ id: string }>> {
  const employeeId = await requireEmployeeId();
  if (employeeId === null) return { ok: false, error: SESSION_EXPIRED_ERROR };

  const parsedId = vacationRequestIdSchema.safeParse(requestId);
  if (!parsedId.success) return { ok: false, error: "Unknown vacation request." };

  try {
    const result = await prisma.vacation_requests.deleteMany({
      where: { id: BigInt(parsedId.data), employee_id: employeeId, status: { not: "approved" } },
    });
    if (result.count === 0) {
      return { ok: false, error: "This request was approved or already removed, so it can't be deleted." };
    }
    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("deleteMyVacationRequest failed", { employeeId: employeeId.toString(), requestId: parsedId.data, error });
    return { ok: false, error: "Could not delete this request. Try again." };
  }
}
