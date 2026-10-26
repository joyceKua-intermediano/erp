import { z } from "zod"
import type { ContractStatus } from "./employees"

// Legacy stores the contract kind in contract_type and keeps one Filament resource per kind.
export const contractKinds = ["employee", "customer", "partner"] as const

export type ContractKind = (typeof contractKinds)[number]

export const contractKindLabels: Record<ContractKind, string> = {
  employee: "Employee",
  customer: "Customer",
  partner: "Partner",
}

export function toContractKind(value: string | null): ContractKind | null {
  return contractKinds.find((kind) => kind === value) ?? null
}

export const PENDING_SIGNATURE = "Pending Signature"

export function isSigned(signature: string | null) {
  return Boolean(signature) && signature !== PENDING_SIGNATURE
}

export type ContractSnapshot = {
  start_date: Date | null
  end_date: Date | null
  signature: string | null
  admin_signature: string | null
}

export function deriveContractStatus(contract: ContractSnapshot | undefined, now: Date): ContractStatus {
  if (!contract) return "none"
  if (contract.end_date && contract.end_date < now) return "ended"
  if (contract.start_date && contract.start_date > now) return "upcoming"
  if (!isSigned(contract.signature) || !isSigned(contract.admin_signature)) return "pending_signature"
  return "active"
}

export type ClusterContract = {
  id: string
  kind: ContractKind | null
  employeeId: string
  employeeName: string
  counterparty: string | null
  jobTitle: string | null
  startDate: string | null
  endDate: string | null
  status: ContractStatus
  employeeSigned: boolean
  adminSigned: boolean
}

export type SupplementaryDetails = {
  standardWorkingHours: string | null
  shiftSchedule: string | null
  noticePeriod: string | null
  paymentTerms: string | null
  billingCurrency: string | null
  paymentCurrency: string | null
}

export type ContractDetail = ClusterContract & {
  rawContractType: string | null
  companyId: string | null
  companyName: string | null
  partnerName: string | null
  quotationTitle: string | null
  countryId: string | null
  countryName: string | null
  countryWork: string | null
  translatedPosition: string | null
  grossSalary: string | null
  isIntegral: boolean
  jobDescription: string | null
  translatedJobDescription: string | null
  templateId: string | null
  templateName: string | null
  hasTypstTemplate: boolean
  isSentToEmployee: boolean
  employeeSignedAt: string | null
  adminSignedAt: string | null
  adminSignedBy: string | null
  clusterLabel: string
  createdAt: string | null
  supplementary: SupplementaryDetails | null
}

export type ContractOption = {
  id: string
  name: string
}

export type ContractFormOptions = {
  employees: ContractOption[]
  companies: ContractOption[]
  countries: ContractOption[]
  templates: ContractOption[]
  clusterCountryId: string | null
  showsSalaryMode: boolean
}

export const salaryModes = ["ordinary", "integral"] as const

export type SalaryMode = (typeof salaryModes)[number]

export const salaryModeLabels: Record<SalaryMode, string> = {
  ordinary: "Ordinary",
  integral: "Integral",
}

export const contractIdSchema = z.string().regex(/^\d+$/, "Invalid contract id.")

const isoDate = z.union([z.literal(""), z.iso.date("Enter a valid date.")])

export function normalizeSalary(value: string) {
  return value.replace(/[,\s]/g, "")
}

export const contractFormSchema = z
  .object({
    employeeId: z.string().regex(/^\d+$/, "Choose an employee."),
    companyId: z.string().regex(/^\d+$/, "Choose a client company."),
    countryId: z.string().regex(/^\d+$/, "Choose the country of work."),
    templateId: z.union([z.literal(""), z.string().regex(/^\d+$/, "Choose a template.")]),
    salaryMode: z.enum(salaryModes),
    jobTitle: z.string().trim().max(255, "Job title is too long."),
    translatedPosition: z.string().trim().max(255, "Translated position is too long."),
    startDate: isoDate,
    endDate: isoDate,
    grossSalary: z
      .string()
      .trim()
      .max(255, "Salary is too long.")
      .refine((value) => value === "" || /^\d+(\.\d{1,2})?$/.test(normalizeSalary(value)), {
        message: "Enter the salary as a number, for example 6500000.00.",
      }),
    jobDescription: z.string().trim().max(65535, "Job description is too long."),
    translatedJobDescription: z.string().trim().max(65535, "Translated job description is too long."),
  })
  .refine((values) => !values.startDate || !values.endDate || values.endDate >= values.startDate, {
    path: ["endDate"],
    message: "The end date can't be before the start date.",
  })

export type ContractFormInput = z.input<typeof contractFormSchema>

// Legacy job descriptions were written in a rich text editor, so they can hold HTML.
export function stripHtml(value: string | null) {
  if (!value) return null
  const text = value
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return text || null
}

export function toContractFormInput(contract: ContractDetail | null): ContractFormInput {
  return {
    employeeId: contract?.employeeId ?? "",
    companyId: contract?.companyId ?? "",
    countryId: contract?.countryId ?? "",
    templateId: contract?.templateId ?? "",
    salaryMode: contract?.isIntegral ? "integral" : "ordinary",
    jobTitle: contract?.jobTitle ?? "",
    translatedPosition: contract?.translatedPosition ?? "",
    startDate: contract?.startDate ?? "",
    endDate: contract?.endDate ?? "",
    grossSalary: contract?.grossSalary ?? "",
    jobDescription: stripHtml(contract?.jobDescription ?? null) ?? "",
    translatedJobDescription: stripHtml(contract?.translatedJobDescription ?? null) ?? "",
  }
}
