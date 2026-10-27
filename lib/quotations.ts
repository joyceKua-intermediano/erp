import { z } from "zod"
import { normalizeSalary } from "./contracts"
import type { QuotationBreakdown } from "./quotations/calculators/types"

// Each legacy cluster has its own Filament form and calculator; these are the ones ported so far.
export const quotationClusterKinds = [
  "colombia",
  "canada",
  "brasil",
  "chile",
  "ecuador",
  "mexico",
  "peru",
  "uruguay",
  "costa-rica",
  "hongkong",
] as const

export type QuotationClusterKind = (typeof quotationClusterKinds)[number]

export function toQuotationClusterKind(countryName: string | null): QuotationClusterKind | null {
  switch (countryName?.toLowerCase().replace(/\s+/g, "")) {
    case "colombia":
      return "colombia"
    case "canada":
      return "canada"
    case "brazil":
    case "brasil":
      return "brasil"
    case "chile":
      return "chile"
    case "ecuador":
      return "ecuador"
    case "mexico":
    case "méxico":
      return "mexico"
    case "peru":
    case "perú":
      return "peru"
    case "uruguay":
      return "uruguay"
    case "costarica":
      return "costa-rica"
    case "hongkong":
      return "hongkong"
    default:
      return null
  }
}

export type PayrollCostKey = "medicalInsurance" | "meal" | "transportation" | "ufMonth" | "eps"

export type PayrollCostField = {
  key: PayrollCostKey
  label: string
  isPercent?: boolean
}

export type QuotationFieldConfig = {
  quotationType: boolean
  province: boolean
  transportAllowance: boolean
  transportAllowanceLabel?: string
  familyAllowance: boolean
  foodAllowance: boolean
  legalGratification: boolean
  payrollCosts: readonly PayrollCostField[]
}

const baseFields: QuotationFieldConfig = {
  quotationType: false,
  province: false,
  transportAllowance: false,
  familyAllowance: false,
  foodAllowance: false,
  legalGratification: false,
  payrollCosts: [],
}

// Mirrors each legacy cluster's Filament quotation form.
export const quotationFields: Record<QuotationClusterKind, QuotationFieldConfig> = {
  colombia: { ...baseFields, quotationType: true, transportAllowance: true },
  canada: { ...baseFields, province: true, legalGratification: true },
  brasil: {
    ...baseFields,
    transportAllowance: true,
    payrollCosts: [
      { key: "medicalInsurance", label: "Medical plan & life insurance" },
      { key: "meal", label: "Meal tickets" },
      { key: "transportation", label: "Transportation tickets" },
    ],
  },
  chile: { ...baseFields, legalGratification: true, payrollCosts: [{ key: "ufMonth", label: "UF of the month" }] },
  ecuador: { ...baseFields, transportAllowance: true },
  mexico: { ...baseFields, transportAllowance: true, transportAllowanceLabel: "Car allowance", foodAllowance: true },
  peru: { ...baseFields, familyAllowance: true, legalGratification: true, payrollCosts: [{ key: "eps", label: "EPS" }] },
  uruguay: { ...baseFields, legalGratification: true },
  "costa-rica": {
    ...baseFields,
    transportAllowance: true,
    payrollCosts: [{ key: "medicalInsurance", label: "Medical insurance (%)", isPercent: true }],
  },
  hongkong: { ...baseFields, transportAllowance: true },
}

export const QUEBEC = "Quebec"

export type QuotationOption = {
  id: string
  name: string
}

export type QuotationListItem = {
  id: string
  title: string
  variant: string | null
  companyName: string
  countryName: string
  provinceName: string | null
  currencyName: string
  billingCurrency: string
  grossSalary: string
  totalInvoice: number | null
  exchangeRate: string
}

export type ClusterQuotations = {
  kind: QuotationClusterKind | null
  quotations: QuotationListItem[]
}

export type QuotationDetail = QuotationListItem & {
  kind: QuotationClusterKind | null
  companyId: string
  provinceId: string | null
  isFixFee: boolean
  fee: string
  bankFee: string
  bonus: string
  homeAllowance: string
  transportAllowance: string
  medicalAllowance: string
  internetAllowance: string
  familyAllowance: string
  foodAllowance: string
  legalGratification: string
  dependent: boolean
  isIntegral: boolean
  medicalInsurance: string
  meal: string
  transportation: string
  ufMonth: string
  eps: string
  clusterLabel: string
  createdAt: string | null
  breakdown: QuotationBreakdown | null
}

export type QuotationFormOptions = {
  kind: QuotationClusterKind | null
  companies: QuotationOption[]
  provinces: QuotationOption[]
}

export const quotationIdSchema = z.string().regex(/^\d+$/, "Invalid quotation id.")

const amount = (label: string, decimals = 2) =>
  z
    .string()
    .trim()
    .refine((value) => new RegExp(`^\\d{1,13}(\\.\\d{1,${decimals}})?$`).test(normalizeSalary(value)), {
      message: `Enter ${label} as a number, for example 1500.00.`,
    })

const currencyCode = (message: string) => z.string().trim().min(1, message).max(255, "Currency is too long.")

export const feeTypes = ["percentage", "fixed"] as const

export type FeeType = (typeof feeTypes)[number]

export const feeTypeLabels: Record<FeeType, string> = {
  percentage: "Percentage rate",
  fixed: "Fixed rate",
}

export const quotationFormSchema = z.object({
  quotationDate: z.iso.date("Enter the quotation date."),
  companyId: z.string().regex(/^\d+$/, "Choose a customer."),
  provinceId: z.union([z.literal(""), z.string().regex(/^\d+$/, "Choose a province.")]),
  isIntegral: z.boolean(),
  currencyName: currencyCode("Enter the payroll currency, for example COP."),
  exchangeRate: z
    .string()
    .trim()
    .refine((value) => /^\d{1,4}(\.\d{1,6})?$/.test(normalizeSalary(value)) && Number(normalizeSalary(value)) > 0, {
      message: "Enter an exchange rate above 0 with up to 6 decimals, for example 4100.",
    }),
  billingCurrency: currencyCode("Enter the billing currency, for example USD."),
  grossSalary: amount("the gross salary"),
  feeType: z.enum(feeTypes),
  fee: amount("the fee", 4),
  bankFee: amount("the bank fee"),
  bonus: amount("the bonus"),
  homeAllowance: amount("the home allowance"),
  transportAllowance: amount("the transport allowance"),
  medicalAllowance: amount("the medical allowance"),
  internetAllowance: amount("the internet allowance"),
  familyAllowance: amount("the family allowance"),
  foodAllowance: amount("the food allowance"),
  legalGratification: amount("the legal gratification"),
  dependent: z.boolean(),
  medicalInsurance: amount("the medical insurance"),
  meal: amount("the meal tickets"),
  transportation: amount("the transportation tickets"),
  ufMonth: amount("the UF of the month"),
  eps: amount("the EPS"),
})

export type QuotationFormInput = z.input<typeof quotationFormSchema>

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Legacy saves the quotation date in the title column, but older rows can hold free text.
export function quotationDateFromTitle(title: string) {
  const candidate = title.trim().slice(0, 10)
  return ISO_DATE.test(candidate) ? candidate : null
}

const amountFormatter = new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" })

export function formatAmount(value: number) {
  return amountFormatter.format(value)
}

export function formatQuotationTitle(title: string) {
  const date = quotationDateFromTitle(title)
  return date && title.trim() === date ? dateFormatter.format(new Date(`${date}T00:00:00Z`)) : title
}

export function toQuotationFormInput(quotation: QuotationDetail | null): QuotationFormInput {
  return {
    quotationDate: quotation ? (quotationDateFromTitle(quotation.title) ?? "") : "",
    companyId: quotation?.companyId ?? "",
    provinceId: quotation?.provinceId ?? "",
    isIntegral: quotation?.isIntegral ?? false,
    currencyName: quotation?.currencyName ?? "",
    exchangeRate: quotation?.exchangeRate ?? "",
    billingCurrency: quotation?.billingCurrency ?? "USD",
    grossSalary: quotation?.grossSalary ?? "",
    feeType: quotation?.isFixFee ? "fixed" : "percentage",
    fee: quotation?.fee ?? "",
    bankFee: quotation?.bankFee ?? "0",
    bonus: quotation?.bonus ?? "0",
    homeAllowance: quotation?.homeAllowance ?? "0",
    transportAllowance: quotation?.transportAllowance ?? "0",
    medicalAllowance: quotation?.medicalAllowance ?? "0",
    internetAllowance: quotation?.internetAllowance ?? "0",
    familyAllowance: quotation?.familyAllowance ?? "0",
    foodAllowance: quotation?.foodAllowance ?? "0",
    legalGratification: quotation?.legalGratification ?? "0",
    dependent: quotation?.dependent ?? false,
    medicalInsurance: quotation?.medicalInsurance ?? "0",
    meal: quotation?.meal ?? "0",
    transportation: quotation?.transportation ?? "0",
    ufMonth: quotation?.ufMonth ?? "0",
    eps: quotation?.eps ?? "0",
  }
}
