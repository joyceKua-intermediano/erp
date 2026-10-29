import "server-only"
import { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import {
  parseTimesheetDays,
  toTimesheetStatus,
  type TimesheetDetail,
  type TimesheetListItem,
  type TimesheetListQuery,
} from "@/lib/timesheets"

// Timesheets belong to the cluster they were submitted in; rows from before that was recorded fall back to the
// employee's current cluster. Archived employees are kept so their past timesheets stay reviewable.
export function clusterTimesheetsWhere(companyId: bigint) {
  return {
    OR: [
      { intermediano_company_id: companyId },
      { intermediano_company_id: null, employees: { intermediano_company_id: companyId } },
    ],
  } satisfies Prisma.monthly_timesheetsWhereInput
}

// Legacy treats a missing or unknown status as pending.
export const pendingTimesheetWhere = {
  OR: [{ status: null }, { status: { notIn: ["approved", "rejected"] } }],
} satisfies Prisma.monthly_timesheetsWhereInput

export function timesheetListWhere(companyId: bigint, query: TimesheetListQuery): Prisma.monthly_timesheetsWhereInput {
  const filters: Prisma.monthly_timesheetsWhereInput[] = [clusterTimesheetsWhere(companyId)]
  if (query.search) {
    filters.push({
      OR: [
        { employees: { name: { contains: query.search } } },
        { companies: { is: { name: { contains: query.search } } } },
      ],
    })
  }
  if (query.month) {
    const [year, month] = query.month.split("-").map(Number)
    filters.push({ year, month })
  }
  if (query.status === "pending") filters.push(pendingTimesheetWhere)
  else if (query.status) filters.push({ status: query.status })
  return { AND: filters }
}

export const timesheetSelect = {
  id: true,
  employee_id: true,
  year: true,
  month: true,
  total_hours: true,
  status: true,
  comment: true,
  created_at: true,
  employees: { select: { name: true } },
  companies: { select: { name: true } },
} satisfies Prisma.monthly_timesheetsSelect

type TimesheetRow = Prisma.monthly_timesheetsGetPayload<{ select: typeof timesheetSelect }>

export function toTimesheetListItem(row: TimesheetRow): TimesheetListItem {
  return {
    id: row.id.toString(),
    employeeId: row.employee_id.toString(),
    employeeName: row.employees.name,
    companyName: row.companies?.name ?? null,
    year: row.year,
    month: row.month,
    totalHours: row.total_hours.toNumber(),
    status: toTimesheetStatus(row.status),
    comment: row.comment,
    submittedAt: row.created_at?.toISOString() ?? null,
  }
}

// Callers must already have scoped `where` to what the signed-in user may see.
export async function findTimesheetDetail(where: Prisma.monthly_timesheetsWhereInput): Promise<TimesheetDetail | null> {
  const row = await prisma.monthly_timesheets.findFirst({
    where,
    select: { ...timesheetSelect, days: true, updated_at: true },
  })
  if (!row) return null

  return {
    ...toTimesheetListItem(row),
    days: parseTimesheetDays(row.days, row.year, row.month),
    updatedAt: row.updated_at?.toISOString() ?? null,
  }
}

// Callers must have checked the cluster permission first.
export async function findClusterTimesheet(companyId: bigint, timesheetId: bigint): Promise<TimesheetDetail | null> {
  return findTimesheetDetail({ id: timesheetId, ...clusterTimesheetsWhere(companyId) })
}

// The employee's cluster when it offers the Timesheets module; null when they have no cluster or it's switched off,
// since admins could never see timesheets submitted there.
export async function findEmployeeTimesheetsCluster(employeeId: bigint): Promise<bigint | null> {
  const employee = await prisma.employees.findFirst({
    where: { id: employeeId, deleted_at: null },
    select: { intermediano_company_id: true },
  })
  const clusterId = employee?.intermediano_company_id ?? null
  if (clusterId === null) return null

  const enabled = await prisma.intermediano_company_modules.findFirst({
    where: { intermediano_company_id: clusterId, module_key: "timesheets", intermediano_companies: { deleted_at: null } },
    select: { module_key: true },
  })
  return enabled ? clusterId : null
}

const contractTypePriority = ["employee", "customer", "partner"] as const

// Legacy bills an employee's timesheets to the customer on their first contract, preferring
// employee contracts, then customer, then partner ones.
export async function findEmployeeContractCompany(
  employeeId: bigint
): Promise<{ companyId: bigint | null; companyName: string | null } | null> {
  const contracts = await prisma.contracts.findMany({
    where: { employee_id: employeeId, deleted_at: null, contract_type: { in: [...contractTypePriority] } },
    orderBy: { id: "asc" },
    select: { contract_type: true, company_id: true, companies: { select: { name: true } } },
  })

  for (const type of contractTypePriority) {
    const contract = contracts.find((row) => row.contract_type === type)
    if (contract) return { companyId: contract.company_id, companyName: contract.companies?.name ?? null }
  }
  return null
}
