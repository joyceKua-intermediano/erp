import "server-only"
import { createHash } from "node:crypto"
import { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import {
  claimTotals,
  parseStoredItems,
  toExpenseLine,
  toExpenseStatus,
  toExpenseType,
  type ExpenseClaim,
  type ExpenseListQuery,
} from "@/lib/expenses"

// employee_expenses has no cluster column, so claims follow the employee's current cluster.
export function clusterExpensesWhere(companyId: bigint) {
  return { employees: { intermediano_company_id: companyId } } satisfies Prisma.employee_expensesWhereInput
}

// Legacy treats an unknown status as pending.
export const pendingExpenseWhere = {
  status: { notIn: ["approved", "rejected"] },
} satisfies Prisma.employee_expensesWhereInput

export function expenseListWhere(companyId: bigint, query: ExpenseListQuery): Prisma.employee_expensesWhereInput {
  const filters: Prisma.employee_expensesWhereInput[] = [clusterExpensesWhere(companyId)]
  if (query.search) {
    filters.push({
      OR: [
        { employees: { name: { contains: query.search } } },
        { companies: { name: { contains: query.search } } },
        { cost_center: { contains: query.search } },
      ],
    })
  }
  if (query.status === "pending") filters.push(pendingExpenseWhere)
  else if (query.status) filters.push({ status: query.status })
  return { AND: filters }
}

export const expenseSelect = {
  id: true,
  employee_id: true,
  expenses: true,
  status: true,
  type: true,
  cost_center: true,
  currency_name: true,
  created_by: true,
  created_at: true,
  employees: { select: { name: true } },
  companies: { select: { name: true } },
} satisfies Prisma.employee_expensesSelect

type ExpenseRow = Prisma.employee_expensesGetPayload<{ select: typeof expenseSelect }>

// A content hash rather than updated_at, which only has whole-second precision.
export function expenseVersion(row: { expenses: string; status: string }) {
  return createHash("sha256").update(`${row.status}\n${row.expenses}`).digest("hex").slice(0, 32)
}

export function toExpenseClaim(row: ExpenseRow): ExpenseClaim {
  const status = toExpenseStatus(row.status)
  const type = toExpenseType(row.type)
  const lines = parseStoredItems(row.expenses).map((item) => toExpenseLine(item, status === "approved" ? "approved" : "pending"))
  return {
    id: row.id.toString(),
    employeeId: row.employee_id.toString(),
    employeeName: row.employees.name,
    companyName: row.companies.name,
    type,
    costCenter: row.cost_center,
    currencyName: row.currency_name,
    createdBy: row.created_by,
    status,
    submittedAt: row.created_at?.toISOString() ?? null,
    version: expenseVersion(row),
    lines,
    totals: claimTotals(type, lines),
  }
}

// Like legacy, the customer and currency come from the employee's first contract.
export async function findEmployeeExpenseContract(employeeId: bigint) {
  const contract = await prisma.contracts.findFirst({
    where: { employee_id: employeeId, deleted_at: null },
    orderBy: { id: "asc" },
    select: {
      company_id: true,
      companies: { select: { name: true } },
      quotations: { select: { currency_name: true } },
    },
  })
  if (!contract) return null
  return {
    companyId: contract.company_id,
    customerName: contract.companies?.name ?? null,
    currencyName: contract.quotations?.currency_name?.trim() || null,
  }
}
