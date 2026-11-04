import { z } from "zod"
import { listSearchSchema, pageNumberSchema } from "./pagination"

// payslips rows: one uploaded file per employee and period. Laravel still lists these rows by `cluster`
// and reads `payslip_period` as a Y-m-d string, so new rows keep both shapes.

export type PayslipItem = {
  id: string
  employeeId: string
  employeeName: string
  // As stored; legacy rows are usually "Y-m-d" but may hold anything.
  period: string
  periodLabel: string
  fileName: string
  uploadedAt: string | null
}

export type ClusterPayslips = {
  // One page of payslips matching the query.
  payslips: PayslipItem[]
  // How many payslips match the query across all pages.
  total: number
  // Figures for the whole cluster, ignoring the query.
  stats: { payslips: number; employees: number; latestPeriod: string | null }
}

export type PayslipEmployeeOption = { id: string; name: string }

const monthValueSchema = z
  .string("Choose a period.")
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Choose the month this payslip covers.")

export const payslipListQuerySchema = z.object({
  page: pageNumberSchema,
  search: listSearchSchema,
  period: monthValueSchema.nullable().catch(null),
})

export type PayslipListQuery = z.output<typeof payslipListQuerySchema>

export const payslipUploadSchema = z.object({
  employeeId: z.string("Choose an employee.").regex(/^\d+$/, "Choose an employee."),
  period: monthValueSchema,
})

export type PayslipUploadInput = z.output<typeof payslipUploadSchema>

export const payslipIdSchema = z.string().regex(/^\d+$/, "Invalid payslip id.")

export const MAX_PAYSLIP_BYTES = 10 * 1024 * 1024

const PAYSLIP_DIRECTORY = "payslips"

export function isPdf(bytes: Uint8Array) {
  return bytes.length >= 5 && String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-"
}

export function payslipPathFor(clusterId: bigint | string, fileId: string) {
  return `${PAYSLIP_DIRECTORY}/${clusterId}/${fileId}.pdf`
}

// "2026-10" from the month picker becomes "2026-10-01", the date shape legacy's DatePicker stored.
export function toStoredPeriod(month: string) {
  return `${month}-01`
}

export function formatPayslipPeriod(raw: string) {
  const value = raw.trim()
  const match = /^(\d{4})-(\d{2})(?:-\d{2})?/.exec(value)
  const month = match ? Number(match[2]) : 0
  if (!match || month < 1 || month > 12) return value || "—"
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(Number(match[1]), month - 1, 1))
  )
}

// Legacy keys rows by its Filament cluster class, e.g. "Intermediano do Brasil Ltda." -> "IntermedianoDoBrasilLtda".
export function legacyClusterKey(companyName: string) {
  return companyName
    .split(/\s+/)
    .map((word) => word.replace(/[.,]/g, ""))
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")
}

const MAX_FILE_NAME_LENGTH = 200

// The original name is only shown and offered as the download name; the stored path never uses it.
export function sanitizePayslipFileName(name: string) {
  const base = (name.split(/[\\/]/).pop() ?? "")
    .replace(/[\u0000-\u001f\u007f"<>|*?:]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  const stem = base.replace(/\.pdf$/i, "").slice(0, MAX_FILE_NAME_LENGTH).trim()
  return `${stem || "payslip"}.pdf`
}
