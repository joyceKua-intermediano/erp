"use server";

import type { ActionResult } from "@/lib/action-result";
import { requireEmployeeSession } from "@/lib/employee-auth";
import {
  buildEmployeeClaimItems,
  expenseClaimFormSchema,
  expenseIdSchema,
  isClaimLocked,
  isEmployeeReceiptPath,
  parseStoredItems,
  toExpenseLine,
  type ExpenseClaim,
  type ExpenseClaimFormInput,
  type MyExpenseClaims,
} from "@/lib/expenses";
import { expenseSelect, expenseVersion, findEmployeeExpenseContract, toExpenseClaim } from "@/lib/expenses/records";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile, storedFileExists } from "@/lib/storage";

// The employee always comes from the session, never from the request, so employees only touch their own claims.

export async function getMyExpenseClaims(): Promise<MyExpenseClaims> {
  const { employeeId } = await requireEmployeeSession();

  try {
    const [rows, contract] = await Promise.all([
      prisma.employee_expenses.findMany({
        where: { employee_id: employeeId },
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        select: expenseSelect,
      }),
      findEmployeeExpenseContract(employeeId),
    ]);

    return {
      claims: rows.map(toExpenseClaim),
      contract: contract
        ? {
            customerName: contract.customerName,
            currencyName: contract.currencyName,
            hasCustomer: contract.companyId !== null,
          }
        : null,
    };
  } catch (error) {
    console.error("getMyExpenseClaims failed", { employeeId: employeeId.toString(), error });
    throw new Error("Could not load your expense claims.");
  }
}

export async function getMyExpenseClaim(expenseId: string): Promise<ExpenseClaim | null> {
  const { employeeId } = await requireEmployeeSession();

  const parsedId = expenseIdSchema.safeParse(expenseId);
  if (!parsedId.success) return null;

  try {
    const row = await prisma.employee_expenses.findFirst({
      where: { id: BigInt(parsedId.data), employee_id: employeeId },
      select: expenseSelect,
    });
    return row ? toExpenseClaim(row) : null;
  } catch (error) {
    console.error("getMyExpenseClaim failed", { employeeId: employeeId.toString(), expenseId: parsedId.data, error });
    throw new Error("Could not load this expense claim.");
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
const CLAIM_CHANGED_ERROR = "This claim changed since you opened it, possibly because it was reviewed. Reload and try again.";

async function missingReceipt(paths: string[]) {
  for (const path of paths) {
    if (!(await storedFileExists(path))) return true;
  }
  return false;
}

// Files this employee uploaded that the claim no longer points at; legacy files are never removed.
async function removeUnusedReceipts(employeeId: bigint, previous: (string | null)[], current: (string | null)[]) {
  const kept = new Set(current);
  const unused = previous.filter(
    (path): path is string => path !== null && !kept.has(path) && isEmployeeReceiptPath(path, employeeId),
  );
  for (const path of new Set(unused)) {
    try {
      await deleteStoredFile(path);
    } catch (error) {
      console.error("removing an unused expense receipt failed", { employeeId: employeeId.toString(), path, error });
    }
  }
}

function receiptsOf(items: Record<string, unknown>[]) {
  return items.map((item) => toExpenseLine(item).receipt);
}

export async function createMyExpenseClaim(input: ExpenseClaimFormInput): Promise<ActionResult<{ id: string }>> {
  const employeeId = await requireEmployeeId();
  if (employeeId === null) return { ok: false, error: SESSION_EXPIRED_ERROR };

  const parsed = expenseClaimFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the claim and try again." };
  }
  const values = parsed.data;

  try {
    const contract = await findEmployeeExpenseContract(employeeId);
    if (!contract) return { ok: false, error: "You need a contract before you can claim expenses. Contact HR." };
    if (contract.companyId === null) {
      return { ok: false, error: "Your contract has no customer to review expenses yet. Contact HR." };
    }

    const built = buildEmployeeClaimItems([], null, values, employeeId);
    if (!built.ok) return built;
    if (await missingReceipt(built.newReceipts)) {
      return { ok: false, error: "A receipt didn't finish uploading. Attach it again and save." };
    }

    const now = new Date();
    const created = await prisma.employee_expenses.create({
      data: {
        employee_id: employeeId,
        company_id: contract.companyId,
        expenses: JSON.stringify(built.items),
        status: built.status,
        type: values.type,
        cost_center: values.costCenter || null,
        currency_name: values.currencyName || contract.currencyName,
        created_by: "employee",
        created_at: now,
        updated_at: now,
      },
      select: { id: true },
    });
    return { ok: true, data: { id: created.id.toString() } };
  } catch (error) {
    console.error("createMyExpenseClaim failed", { employeeId: employeeId.toString(), error });
    return { ok: false, error: "Could not submit this claim. Try again." };
  }
}

// Approved items stay as they are; edited and new items go back for review.
export async function updateMyExpenseClaim(
  expenseId: string,
  input: ExpenseClaimFormInput,
): Promise<ActionResult<{ id: string }>> {
  const employeeId = await requireEmployeeId();
  if (employeeId === null) return { ok: false, error: SESSION_EXPIRED_ERROR };

  const parsedId = expenseIdSchema.safeParse(expenseId);
  if (!parsedId.success) return { ok: false, error: "Unknown expense claim." };

  const parsed = expenseClaimFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the claim and try again." };
  }
  const values = parsed.data;

  try {
    const id = BigInt(parsedId.data);
    const row = await prisma.employee_expenses.findFirst({
      where: { id, employee_id: employeeId },
      select: expenseSelect,
    });
    if (!row) return { ok: false, error: "This expense claim no longer exists." };

    const claim = toExpenseClaim(row);
    if (values.version !== expenseVersion(row)) return { ok: false, error: CLAIM_CHANGED_ERROR };
    if (isClaimLocked(claim)) return { ok: false, error: "This claim has been approved and can't be changed." };

    const storedItems = parseStoredItems(row.expenses);
    const built = buildEmployeeClaimItems(storedItems, claim.type, values, employeeId, claim.status === "approved" ? "approved" : "pending");
    if (!built.ok) return built;
    if (await missingReceipt(built.newReceipts)) {
      return { ok: false, error: "A receipt didn't finish uploading. Attach it again and save." };
    }

    const result = await prisma.employee_expenses.updateMany({
      where: { id, employee_id: employeeId, expenses: row.expenses, status: row.status },
      data: {
        expenses: JSON.stringify(built.items),
        status: built.status,
        type: values.type,
        cost_center: values.costCenter || null,
        currency_name: values.currencyName || row.currency_name,
        updated_at: new Date(),
      },
    });
    if (result.count === 0) return { ok: false, error: CLAIM_CHANGED_ERROR };

    await removeUnusedReceipts(employeeId, receiptsOf(storedItems), receiptsOf(built.items));
    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("updateMyExpenseClaim failed", { employeeId: employeeId.toString(), expenseId: parsedId.data, error });
    return { ok: false, error: "Could not save this claim. Try again." };
  }
}

// Claims with an approved item stay, since that money has been agreed.
export async function deleteMyExpenseClaim(expenseId: string): Promise<ActionResult<{ id: string }>> {
  const employeeId = await requireEmployeeId();
  if (employeeId === null) return { ok: false, error: SESSION_EXPIRED_ERROR };

  const parsedId = expenseIdSchema.safeParse(expenseId);
  if (!parsedId.success) return { ok: false, error: "Unknown expense claim." };

  try {
    const id = BigInt(parsedId.data);
    const row = await prisma.employee_expenses.findFirst({
      where: { id, employee_id: employeeId },
      select: expenseSelect,
    });
    if (!row) return { ok: false, error: "This expense claim was already removed." };

    const claim = toExpenseClaim(row);
    if (claim.status === "approved" || claim.lines.some((line) => line.status === "approved")) {
      return { ok: false, error: "This claim has approved expenses, so it can't be deleted." };
    }

    const result = await prisma.employee_expenses.deleteMany({
      where: { id, employee_id: employeeId, expenses: row.expenses, status: row.status },
    });
    if (result.count === 0) return { ok: false, error: CLAIM_CHANGED_ERROR };

    await removeUnusedReceipts(employeeId, receiptsOf(parseStoredItems(row.expenses)), []);
    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("deleteMyExpenseClaim failed", { employeeId: employeeId.toString(), expenseId: parsedId.data, error });
    return { ok: false, error: "Could not delete this claim. Try again." };
  }
}
