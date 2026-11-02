"use server";

import type { ActionResult } from "@/lib/action-result";
import { requireCustomerSession } from "@/lib/customer-auth";
import { customerExpensesWhere } from "@/lib/customer-portal";
import {
  approvePendingItems,
  expenseIdSchema,
  expenseListQuerySchema,
  expenseReviewSchema,
  parseStoredItems,
  rollupClaimStatus,
  toExpenseLine,
  type ClusterExpenseClaims,
  type ExpenseClaim,
  type ExpenseListQuery,
  type ExpenseReviewInput,
  type ExpenseStatus,
} from "@/lib/expenses";
import {
  expenseSelect,
  expenseVersion,
  pendingExpenseWhere,
  scopedExpenseListWhere,
  toExpenseClaim,
} from "@/lib/expenses/records";
import { pageArgs } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

export async function getCustomerExpenseClaims(query?: ExpenseListQuery): Promise<ClusterExpenseClaims> {
  const { companyId } = await requireCustomerSession();
  const listQuery = expenseListQuerySchema.parse(query ?? {});

  try {
    const scope = customerExpensesWhere(companyId);
    const where = scopedExpenseListWhere(scope, listQuery);
    const [rows, total, scopeTotal, pending, employees] = await Promise.all([
      prisma.employee_expenses.findMany({
        where,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        select: expenseSelect,
        ...pageArgs(listQuery.page),
      }),
      prisma.employee_expenses.count({ where }),
      prisma.employee_expenses.count({ where: scope }),
      prisma.employee_expenses.count({ where: { AND: [scope, pendingExpenseWhere] } }),
      prisma.employee_expenses.groupBy({ by: ["employee_id"], where: scope }),
    ]);
    return {
      claims: rows.map(toExpenseClaim),
      total,
      stats: { claims: scopeTotal, pending, employees: employees.length },
    };
  } catch (error) {
    console.error("getCustomerExpenseClaims failed", { companyId: companyId.toString(), error });
    throw new Error("Could not load your team's expense claims.");
  }
}

export async function getCustomerExpenseClaim(expenseId: string): Promise<ExpenseClaim | null> {
  const { companyId } = await requireCustomerSession();

  const parsedId = expenseIdSchema.safeParse(expenseId);
  if (!parsedId.success) return null;

  try {
    const row = await prisma.employee_expenses.findFirst({
      where: { id: BigInt(parsedId.data), ...customerExpensesWhere(companyId) },
      select: expenseSelect,
    });
    return row ? toExpenseClaim(row) : null;
  } catch (error) {
    console.error("getCustomerExpenseClaim failed", { companyId: companyId.toString(), expenseId: parsedId.data, error });
    throw new Error("Could not load this expense claim.");
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

const CLAIM_CHANGED_ERROR = "This claim changed since you opened it. Reload to see the latest version.";

// Each pending item is reviewed on its own and the decision is final; the claim's status follows its items.
export async function reviewCustomerExpenseItem(
  expenseId: string,
  input: ExpenseReviewInput,
): Promise<ActionResult<{ id: string; status: ExpenseStatus }>> {
  const companyId = await requireCustomerCompanyId();
  if (companyId === null) return { ok: false, error: "Your session has expired. Sign in again." };

  const parsedId = expenseIdSchema.safeParse(expenseId);
  if (!parsedId.success) return { ok: false, error: "Unknown expense claim." };

  const parsed = expenseReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the review and try again." };
  }
  const { index, status, comments, version } = parsed.data;

  try {
    const id = BigInt(parsedId.data);
    const row = await prisma.employee_expenses.findFirst({
      where: { id, ...customerExpensesWhere(companyId) },
      select: expenseSelect,
    });
    if (!row) return { ok: false, error: "This claim no longer exists." };
    if (version !== expenseVersion(row)) return { ok: false, error: CLAIM_CHANGED_ERROR };

    const claim = toExpenseClaim(row);
    const line = claim.lines[index];
    if (!line) return { ok: false, error: CLAIM_CHANGED_ERROR };
    if (claim.status === "approved" || line.status !== "pending") {
      return { ok: false, error: "This expense was already reviewed." };
    }

    // Only status and comments change, so every other key legacy stored stays as it was.
    const storedItems = parseStoredItems(row.expenses);
    storedItems[index] = { ...storedItems[index], status, comments };
    const claimStatus = rollupClaimStatus(storedItems.map((item) => toExpenseLine(item).status));

    const result = await prisma.employee_expenses.updateMany({
      where: { id, expenses: row.expenses, status: row.status, ...customerExpensesWhere(companyId) },
      data: { expenses: JSON.stringify(storedItems), status: claimStatus, updated_at: new Date() },
    });
    if (result.count === 0) return { ok: false, error: CLAIM_CHANGED_ERROR };

    return { ok: true, data: { id: parsedId.data, status: claimStatus } };
  } catch (error) {
    console.error("reviewCustomerExpenseItem failed", {
      companyId: companyId.toString(),
      expenseId: parsedId.data,
      index,
      error,
    });
    return { ok: false, error: "Could not save this review. Try again." };
  }
}

export async function approveCustomerExpenseClaim(
  expenseId: string,
  version: string,
): Promise<ActionResult<{ id: string; status: ExpenseStatus; approved: number }>> {
  const companyId = await requireCustomerCompanyId();
  if (companyId === null) return { ok: false, error: "Your session has expired. Sign in again." };

  const parsedId = expenseIdSchema.safeParse(expenseId);
  if (!parsedId.success) return { ok: false, error: "Unknown expense claim." };
  if (typeof version !== "string" || version.length === 0 || version.length > 64) {
    return { ok: false, error: CLAIM_CHANGED_ERROR };
  }

  try {
    const id = BigInt(parsedId.data);
    const row = await prisma.employee_expenses.findFirst({
      where: { id, ...customerExpensesWhere(companyId) },
      select: expenseSelect,
    });
    if (!row) return { ok: false, error: "This claim no longer exists." };
    if (version !== expenseVersion(row)) return { ok: false, error: CLAIM_CHANGED_ERROR };
    if (toExpenseClaim(row).status === "approved") return { ok: false, error: "This claim is already approved." };

    const { items, approved, status } = approvePendingItems(parseStoredItems(row.expenses));
    if (approved === 0) return { ok: false, error: "Every expense on this claim was already reviewed." };

    const result = await prisma.employee_expenses.updateMany({
      where: { id, expenses: row.expenses, status: row.status, ...customerExpensesWhere(companyId) },
      data: { expenses: JSON.stringify(items), status, updated_at: new Date() },
    });
    if (result.count === 0) return { ok: false, error: CLAIM_CHANGED_ERROR };

    return { ok: true, data: { id: parsedId.data, status, approved } };
  } catch (error) {
    console.error("approveCustomerExpenseClaim failed", { companyId: companyId.toString(), expenseId: parsedId.data, error });
    return { ok: false, error: "Could not approve this claim. Try again." };
  }
}
