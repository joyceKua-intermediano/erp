import "server-only"
import { Prisma } from "@/lib/generated/prisma/client"
import { daysInMonth, parseStoredHolidays } from "@/lib/holidays"
import { prisma } from "@/lib/prisma"
import {
  parseNumberOfDays,
  toDateValue,
  toVacationStatus,
  type VacationListQuery,
  type VacationRequestItem,
} from "@/lib/vacations"

// vacation_requests has no cluster column, so requests follow the employee's current cluster.
export function clusterVacationsWhere(companyId: bigint) {
  return { employees: { intermediano_company_id: companyId } } satisfies Prisma.vacation_requestsWhereInput
}

// Legacy treats an unknown status as pending.
export const pendingVacationWhere = {
  status: { notIn: ["approved", "rejected"] },
} satisfies Prisma.vacation_requestsWhereInput

export function vacationListWhere(companyId: bigint, query: VacationListQuery): Prisma.vacation_requestsWhereInput {
  const filters: Prisma.vacation_requestsWhereInput[] = [clusterVacationsWhere(companyId)]
  if (query.search) {
    filters.push({
      OR: [{ employees: { name: { contains: query.search } } }, { companies: { name: { contains: query.search } } }],
    })
  }
  if (query.status === "pending") filters.push(pendingVacationWhere)
  else if (query.status) filters.push({ status: query.status })
  return { AND: filters }
}

export const vacationSelect = {
  id: true,
  employee_id: true,
  start_date: true,
  end_date: true,
  number_of_days: true,
  status: true,
  created_at: true,
  employees: { select: { name: true } },
  companies: { select: { name: true } },
} satisfies Prisma.vacation_requestsSelect

type VacationRow = Prisma.vacation_requestsGetPayload<{ select: typeof vacationSelect }>

export function toVacationRequestItem(row: VacationRow): VacationRequestItem {
  return {
    id: row.id.toString(),
    employeeId: row.employee_id.toString(),
    employeeName: row.employees.name,
    companyName: row.companies.name,
    startDate: row.start_date ? toDateValue(row.start_date) : null,
    endDate: row.end_date ? toDateValue(row.end_date) : null,
    numberOfDays: parseNumberOfDays(row.number_of_days),
    status: toVacationStatus(row.status),
    submittedAt: row.created_at?.toISOString() ?? null,
  }
}

// Legacy accrues vacation from the employee's first employee-type contract; company_id is the customer who reviews it.
export async function findEmployeeVacationContract(employeeId: bigint) {
  const contract = await prisma.contracts.findFirst({
    where: { employee_id: employeeId, deleted_at: null, contract_type: "employee" },
    orderBy: { id: "asc" },
    select: {
      start_date: true,
      country_id: true,
      company_id: true,
      countries: { select: { name: true } },
      companies: { select: { name: true } },
    },
  })
  if (!contract) return null
  return {
    startDate: contract.start_date,
    countryId: contract.country_id,
    countryName: contract.countries?.name ?? null,
    companyId: contract.company_id,
    companyName: contract.companies?.name ?? null,
  }
}

// Days already used or reserved; `excludeId` leaves out the request being edited.
export async function findVacationUsage(employeeId: bigint, excludeId?: bigint) {
  const rows = await prisma.vacation_requests.findMany({
    where: { employee_id: employeeId, status: { not: "rejected" }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { number_of_days: true, status: true },
  })
  let taken = 0
  let pending = 0
  for (const row of rows) {
    if (row.status === "approved") taken += parseNumberOfDays(row.number_of_days)
    else pending += parseNumberOfDays(row.number_of_days)
  }
  return { taken, pending }
}

// Non-rejected requests whose dates overlap the range; legacy rows without dates never overlap.
export async function findOverlappingVacation(employeeId: bigint, startDate: Date, endDate: Date, excludeId?: bigint) {
  return prisma.vacation_requests.findFirst({
    where: {
      employee_id: employeeId,
      status: { not: "rejected" },
      start_date: { lte: endDate },
      end_date: { gte: startDate },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { start_date: true, end_date: true },
  })
}

export async function findHolidayDates(countryId: bigint | null, years: number[]): Promise<string[]> {
  if (countryId === null) return []
  const sets = await prisma.holidays.findMany({
    where: { country_id: countryId, year: { in: years }, deleted_at: null },
    select: { year: true, holidays: true },
  })
  return sets.flatMap((set) =>
    parseStoredHolidays(set.holidays)
      .filter((entry) => entry.day <= daysInMonth(set.year, entry.month))
      .map((entry) => `${set.year}-${String(entry.month).padStart(2, "0")}-${String(entry.day).padStart(2, "0")}`)
  )
}
