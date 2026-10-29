import { z } from "zod"
import { listSearchSchema, pageNumberSchema } from "./pagination"

// One monthly_timesheets row per employee and month; employees submit it and reviewers approve or reject it.

export const timesheetStatuses = ["pending", "approved", "rejected"] as const

export type TimesheetStatus = (typeof timesheetStatuses)[number]

export const timesheetStatusLabels: Record<TimesheetStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
}

export function toTimesheetStatus(value: string | null): TimesheetStatus {
  return timesheetStatuses.find((status) => status === value) ?? "pending"
}

export type TimesheetListItem = {
  id: string
  employeeId: string
  employeeName: string
  companyName: string | null
  year: number
  month: number
  totalHours: number
  status: TimesheetStatus
  comment: string | null
  submittedAt: string | null
}

export type ClusterTimesheets = {
  // One page of timesheets matching the query.
  timesheets: TimesheetListItem[]
  // How many timesheets match the query across all pages.
  total: number
  // Figures for the whole cluster, ignoring the query.
  stats: { timesheets: number; pending: number; employees: number }
}

export const timesheetListQuerySchema = z.object({
  page: pageNumberSchema,
  search: listSearchSchema,
  // An <input type="month"> value, e.g. "2026-10", or "" for any month.
  month: z.union([z.literal(""), z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)]).catch(""),
  status: z.enum(timesheetStatuses).nullable().catch(null),
})

export type TimesheetListQuery = z.output<typeof timesheetListQuerySchema>

export type TimesheetDetail = TimesheetListItem & {
  // Hours for day 1 onwards, one entry per day of the month.
  days: number[]
  updatedAt: string | null
}

export const timesheetIdSchema = z.string().regex(/^\d+$/, "Invalid timesheet id.")

export const timesheetReviewSchema = z.object({
  status: z.enum(["approved", "rejected"], "Choose whether to approve or reject this timesheet."),
  comment: z.string().trim().max(255, "Keep the comment under 255 characters."),
})

export type TimesheetReviewInput = z.input<typeof timesheetReviewSchema>

export type MyTimesheets = {
  timesheets: TimesheetListItem[]
  // The customer new timesheets are submitted to, from the employee's contract; null without a contract.
  customerName: string | null
  hasContract: boolean
  // False when the employee has no cluster or their cluster has the Timesheets module switched off.
  timesheetsEnabled: boolean
}

// Legacy offers last year, this year and next year in the month picker.
export function timesheetYearOptions(now = new Date()) {
  const year = now.getFullYear()
  return [year - 1, year, year + 1]
}

const timesheetHoursSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1, "Choose a month.").max(12, "Choose a month."),
  days: z.array(
    z
      .number("Enter hours as a number.")
      .min(0, "Hours can't be negative.")
      .max(24, "A day can't have more than 24 hours.")
      .refine((hours) => Number.isInteger(hours * 4), "Enter hours in steps of 0.25.")
  ),
})

function checkEveryDay(values: z.output<typeof timesheetHoursSchema>, context: z.RefinementCtx) {
  if (values.days.length !== daysInMonth(values.year, values.month)) {
    context.addIssue({ code: "custom", path: ["days"], message: "Enter hours for every day of the month." })
  }
}

export const timesheetFormSchema = timesheetHoursSchema.superRefine((values, context) => {
  if (!timesheetYearOptions().includes(values.year)) {
    context.addIssue({ code: "custom", path: ["year"], message: "Choose last year, this year or next year." })
  }
  checkEveryDay(values, context)
})

// Edits keep the timesheet's original period, which may be older than the create form allows.
export const timesheetUpdateSchema = timesheetHoursSchema.superRefine(checkEveryDay)

export type TimesheetFormInput = z.input<typeof timesheetFormSchema>

export function sumHours(days: readonly number[]) {
  return Math.round(days.reduce((total, hours) => total + hours, 0) * 100) / 100
}

// Stored the way legacy's array cast writes it: an object keyed by day number, starting at "1".
export function toStoredDays(days: readonly number[]) {
  return JSON.stringify(Object.fromEntries(days.map((hours, index) => [String(index + 1), hours])))
}

export function daysInMonth(year: number, month: number) {
  if (!Number.isInteger(month) || month < 1 || month > 12) return 31
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function toHours(value: unknown) {
  const hours = typeof value === "string" ? Number(value.trim()) : value
  return typeof hours === "number" && Number.isFinite(hours) && hours > 0 ? hours : 0
}

// Legacy casts `days` to a PHP array keyed 1..31, so it's usually stored as {"1": 8, ...}, with numbers or numeric strings.
export function parseTimesheetDays(raw: string | null, year: number, month: number): number[] {
  const count = daysInMonth(year, month)
  let parsed: unknown = null
  try {
    parsed = raw ? JSON.parse(raw) : null
    if (typeof parsed === "string") parsed = JSON.parse(parsed)
  } catch {
    parsed = null
  }

  if (Array.isArray(parsed)) {
    return Array.from({ length: count }, (_, index) => toHours(parsed[index]))
  }
  if (parsed && typeof parsed === "object") {
    const byDay = parsed as Record<string, unknown>
    return Array.from({ length: count }, (_, index) => toHours(byDay[String(index + 1)]))
  }
  return Array.from({ length: count }, () => 0)
}

export function formatPeriod(year: number, month: number) {
  if (!Number.isInteger(month) || month < 1 || month > 12) return "Invalid date"
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    Date.UTC(year, month - 1, 1)
  )
}

export function formatMonthName(month: number) {
  if (!Number.isInteger(month) || month < 1 || month > 12) return String(month)
  return new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(Date.UTC(2000, month - 1, 1))
}

// Matches the value of an <input type="month">, e.g. "2026-10".
export function toMonthValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`
}

export function formatHours(hours: number) {
  return hours.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function csvCell(value: string | number) {
  let text = String(value)
  // Keeps spreadsheet apps from evaluating names like "=SUM(...)" as formulas.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// Same columns as the legacy Excel export: Employee, Month, Year, Day 1..31, Total Hours.
export function toTimesheetCsv(
  timesheet: Pick<TimesheetDetail, "employeeName" | "year" | "month" | "days" | "totalHours">
) {
  const headings = ["Employee", "Month", "Year", ...Array.from({ length: 31 }, (_, index) => `Day ${index + 1}`), "Total Hours"]
  const days = Array.from({ length: 31 }, (_, index) => (index < timesheet.days.length ? timesheet.days[index] : ""))
  const row = [timesheet.employeeName, formatMonthName(timesheet.month), timesheet.year, ...days, timesheet.totalHours]
  return [headings, row].map((cells) => cells.map(csvCell).join(",")).join("\r\n") + "\r\n"
}

export function timesheetFileName(timesheet: Pick<TimesheetDetail, "employeeName" | "year" | "month">) {
  return `timesheet-${formatPeriod(timesheet.year, timesheet.month)}-${timesheet.employeeName}.csv`
}
