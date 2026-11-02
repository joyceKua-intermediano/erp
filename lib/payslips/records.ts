import "server-only"
import { Prisma } from "@/lib/generated/prisma/client"
import { formatPayslipPeriod, type PayslipItem, type PayslipListQuery } from "@/lib/payslips"

// Like expenses, payslips follow the employee's current cluster rather than the legacy `cluster` string.
export function clusterPayslipsWhere(companyId: bigint) {
  return { employees: { intermediano_company_id: companyId } } satisfies Prisma.payslipsWhereInput
}

export function payslipListWhere(companyId: bigint, query: PayslipListQuery): Prisma.payslipsWhereInput {
  const filters: Prisma.payslipsWhereInput[] = [clusterPayslipsWhere(companyId)]
  if (query.search) {
    filters.push({
      OR: [{ employees: { name: { contains: query.search } } }, { file_name: { contains: query.search } }],
    })
  }
  if (query.period) filters.push({ payslip_period: { startsWith: query.period } })
  return { AND: filters }
}

// Stored periods are "Y-m-d" strings, so sorting them as text is also chronological.
export const payslipOrderBy = [
  { payslip_period: "desc" },
  { id: "desc" },
] satisfies Prisma.payslipsOrderByWithRelationInput[]

export const payslipSelect = {
  id: true,
  employee_id: true,
  payslip_period: true,
  file_name: true,
  created_at: true,
  employees: { select: { name: true } },
} satisfies Prisma.payslipsSelect

type PayslipRow = Prisma.payslipsGetPayload<{ select: typeof payslipSelect }>

export function toPayslipItem(row: PayslipRow): PayslipItem {
  return {
    id: row.id.toString(),
    employeeId: row.employee_id.toString(),
    employeeName: row.employees.name,
    period: row.payslip_period,
    periodLabel: formatPayslipPeriod(row.payslip_period),
    fileName: row.file_name,
    uploadedAt: row.created_at?.toISOString() ?? null,
  }
}
