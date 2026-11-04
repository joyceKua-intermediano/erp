"use server";

import type { ActionResult } from "@/lib/action-result";
import { requireClusterPermission } from "@/lib/auth";
import {
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
  clusterExpensesWhere,
  expenseListWhere,
  expenseSelect,
  expenseVersion,
  pendingExpenseWhere,
  toExpenseClaim,
} from "@/lib/expenses/records";
import { pageArgs } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

export async function getClusterExpenseClaims(
  clusterId: string,
  query?: ExpenseListQuery,
): Promise<ClusterExpenseClaims> {
  const { clusterId: companyId } = await requireClusterPermission(clusterId, "expenses.list");
  const listQuery = expenseListQuerySchema.parse(query ?? {});

  try {
    const clusterWhere = clusterExpensesWhere(companyId);
    const where = expenseListWhere(companyId, listQuery);
    const [rows, total, clusterTotal, pending, employees] = await Promise.all([
      prisma.employee_expenses.findMany({
        where,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        select: expenseSelect,
        ...pageArgs(listQuery.page),
      }),
      prisma.employee_expenses.count({ where }),
      prisma.employee_expenses.count({ where: clusterWhere }),
      prisma.employee_expenses.count({ where: { AND: [clusterWhere, pendingExpenseWhere] } }),
      prisma.employee_expenses.groupBy({ by: ["employee_id"], where: clusterWhere }),
    ]);
    return {
      claims: rows.map(toExpenseClaim),
      total,
      stats: { claims: clusterTotal, pending, employees: employees.length },
    };
  } catch (error) {
    console.error("getClusterExpenseClaims failed", { clusterId: companyId.toString(), error });
    throw new Error("Could not load expense claims for this cluster.");
  }
}

export async function getClusterExpenseClaim(clusterId: string, expenseId: string): Promise<ExpenseClaim | null> {
  const { clusterId: companyId } = await requireClusterPermission(clusterId, "expenses.show");

  const parsedId = expenseIdSchema.safeParse(expenseId);
  if (!parsedId.success) return null;

  try {
    const row = await prisma.employee_expenses.findFirst({
      where: { id: BigInt(parsedId.data), ...clusterExpensesWhere(companyId) },
      select: expenseSelect,
    });
    return row ? toExpenseClaim(row) : null;
  } catch (error) {
    console.error("getClusterExpenseClaim failed", { clusterId: companyId.toString(), expenseId: parsedId.data, error });
    throw new Error("Could not load this expense claim.");
  }
}

async function requireManageCluster(clusterId: string): Promise<bigint | null> {
  try {
    const { clusterId: companyId } = await requireClusterPermission(clusterId, "expenses.edit");
    return companyId;
  } catch {
    return null;
  }
}

const CLAIM_CHANGED_ERROR = "This claim changed since you opened it. Reload to see the latest version.";

// Each pending item is reviewed on its own and the decision is final; the claim's status follows its items.
export async function reviewExpenseItem(
  clusterId: string,
  expenseId: string,
  input: ExpenseReviewInput,
): Promise<ActionResult<{ id: string; status: ExpenseStatus }>> {
  const companyId = await requireManageCluster(clusterId);
  if (companyId === null) {
    return { ok: false, error: "You don't have permission to review expenses in this cluster." };
  }

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
      where: { id, ...clusterExpensesWhere(companyId) },
      select: expenseSelect,
    });
    if (!row) return { ok: false, error: "This claim no longer exists in this cluster." };
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
      where: { id, expenses: row.expenses, status: row.status, ...clusterExpensesWhere(companyId) },
      data: { expenses: JSON.stringify(storedItems), status: claimStatus, updated_at: new Date() },
    });
    if (result.count === 0) return { ok: false, error: CLAIM_CHANGED_ERROR };

    return { ok: true, data: { id: parsedId.data, status: claimStatus } };
  } catch (error) {
    console.error("reviewExpenseItem failed", { clusterId: companyId.toString(), expenseId: parsedId.data, index, error });
    return { ok: false, error: "Could not save this review. Try again." };
  }
}
