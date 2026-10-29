import { z } from "zod"
import { listSearchSchema, pageNumberSchema } from "./pagination"

// vacation_requests rows: employees submit a date range and a number of days, reviewers approve or reject it.

export const vacationStatuses = ["pending", "approved", "rejected"] as const

export type VacationStatus = (typeof vacationStatuses)[number]

export const vacationStatusLabels: Record<VacationStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
}

export function toVacationStatus(value: string | null): VacationStatus {
  return vacationStatuses.find((status) => status === value) ?? "pending"
}

export type VacationRequestItem = {
  id: string
  employeeId: string
  employeeName: string
  companyName: string | null
  // "YYYY-MM-DD", or null on legacy rows saved without dates.
  startDate: string | null
  endDate: string | null
  numberOfDays: number
  status: VacationStatus
  submittedAt: string | null
}

export type ClusterVacationRequests = {
  // One page of requests matching the query.
  requests: VacationRequestItem[]
  // How many requests match the query across all pages.
  total: number
  // Figures for the whole cluster, ignoring the query.
  stats: { requests: number; pending: number; employees: number }
}

export const vacationListQuerySchema = z.object({
  page: pageNumberSchema,
  search: listSearchSchema,
  status: z.enum(vacationStatuses).nullable().catch(null),
})

export type VacationListQuery = z.output<typeof vacationListQuerySchema>

export const vacationRequestIdSchema = z.string().regex(/^\d+$/, "Invalid vacation request id.")

export const vacationReviewSchema = z.object({
  status: z.enum(["approved", "rejected"], "Choose whether to approve or reject this request."),
})

export type VacationReviewInput = z.input<typeof vacationReviewSchema>

export type VacationBalance = {
  annualDays: number
  accrued: number
  // Days on approved requests.
  taken: number
  // Days on requests still waiting for review.
  pending: number
  available: number
}

export type MyVacationRequests = {
  requests: VacationRequestItem[]
  // Null without an employee contract, since legacy accrues nothing until one exists.
  balance: VacationBalance | null
  customerName: string | null
  // Holidays in the contract's country as "YYYY-MM-DD", used to pre-fill the number of days.
  holidayDates: string[]
}

const MAX_RANGE_DAYS = 366

const dateValueSchema = z
  .string("Choose a date.")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.")
  .refine((value) => toDateValue(parseDateValue(value)) === value, "Choose a valid date.")

export const vacationFormSchema = z
  .object({
    startDate: dateValueSchema,
    endDate: dateValueSchema,
    numberOfDays: z
      .number("Enter the number of days.")
      .positive("Request at least half a day.")
      .max(MAX_RANGE_DAYS, "That's more days than fit in the dates.")
      .refine((days) => Number.isInteger(days * 2), "Enter days in steps of 0.5."),
  })
  .superRefine((values, context) => {
    if (!dateValueSchema.safeParse(values.startDate).success || !dateValueSchema.safeParse(values.endDate).success) return
    const span = calendarDaysBetween(values.startDate, values.endDate)
    if (span < 1) {
      context.addIssue({ code: "custom", path: ["endDate"], message: "The end date can't be before the start date." })
      return
    }
    if (span > MAX_RANGE_DAYS) {
      context.addIssue({ code: "custom", path: ["endDate"], message: "Request at most one year at a time." })
      return
    }
    if (values.numberOfDays > span) {
      context.addIssue({
        code: "custom",
        path: ["numberOfDays"],
        message: `These dates cover ${span} ${span === 1 ? "day" : "days"}, so you can't request more.`,
      })
    }
  })

export type VacationFormInput = z.input<typeof vacationFormSchema>

// @db.Date columns come back as UTC midnight.
export function parseDateValue(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

export function toDateValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

// Inclusive of both ends, so the same start and end date is one day.
export function calendarDaysBetween(startDate: string, endDate: string) {
  return Math.round((parseDateValue(endDate).getTime() - parseDateValue(startDate).getTime()) / 86_400_000) + 1
}

// Weekdays in the range that aren't holidays; the suggested value for number_of_days.
export function countWorkingDays(startDate: string, endDate: string, holidayDates: ReadonlySet<string>) {
  const span = calendarDaysBetween(startDate, endDate)
  if (!Number.isFinite(span) || span < 1 || span > MAX_RANGE_DAYS) return 0

  const start = parseDateValue(startDate)
  let count = 0
  for (let offset = 0; offset < span; offset++) {
    const day = new Date(start.getTime() + offset * 86_400_000)
    const weekday = day.getUTCDay()
    if (weekday !== 0 && weekday !== 6 && !holidayDates.has(toDateValue(day))) count++
  }
  return count
}

// Legacy's yearly allowance by contract country; the seed spells Brazil "Brasil", which legacy missed.
export function annualVacationDays(countryName: string | null) {
  switch (countryName?.trim()) {
    case "Colombia":
      return 15
    case "Brazil":
    case "Brasil":
      return 30
    default:
      return 10
  }
}

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

// Legacy pro-rates the yearly allowance by whole days since the contract start, using the start year's length.
export function accruedVacationDays(annualDays: number, contractStart: Date | null, today: Date) {
  if (!contractStart) return 0
  const daysWorked = Math.floor((today.getTime() - contractStart.getTime()) / 86_400_000)
  if (daysWorked <= 0) return 0
  const daysInYear = isLeapYear(contractStart.getUTCFullYear()) ? 366 : 365
  return (annualDays * daysWorked) / daysInYear
}

function roundDays(days: number) {
  return Math.round(days * 100) / 100
}

export function toVacationBalance(annualDays: number, accrued: number, taken: number, pending: number): VacationBalance {
  return {
    annualDays,
    accrued: roundDays(accrued),
    taken: roundDays(taken),
    pending: roundDays(pending),
    available: roundDays(Math.max(0, accrued - taken - pending)),
  }
}

// number_of_days is a varchar; legacy's numeric input may have saved "5", "5.5" or "5,5".
export function parseNumberOfDays(raw: string | null) {
  const days = Number(raw?.trim().replace(",", "."))
  return Number.isFinite(days) && days > 0 ? days : 0
}

export function formatDays(days: number) {
  const text = days.toLocaleString("en-US", { maximumFractionDigits: 2 })
  return `${text} ${days === 1 ? "day" : "days"}`
}

export function formatVacationDate(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(parseDateValue(value))
}

export function formatVacationRange(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return "No dates"
  if (startDate === endDate) return formatVacationDate(startDate)
  return `${formatVacationDate(startDate)} – ${formatVacationDate(endDate)}`
}
