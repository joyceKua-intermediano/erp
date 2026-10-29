import { z } from "zod"
import { normalizeSalary } from "./contracts"
import { listSearchSchema, pageNumberSchema } from "./pagination"
import {
  quotationDateFromTitle,
  quotationFormSchema,
  toQuotationFormInput,
  type QuotationClusterKind,
  type QuotationDetail,
  type QuotationFormOptions,
  type QuotationOption,
} from "./quotations"

// A payroll run is a quotations row with is_payroll = 1, billed for one consultant and one month.

export type PayrollProvisionType = {
  // The provision_types.name that legacy saves payments against.
  name: string
  // The matching line in the calculator's "Provisions" section.
  line: string
}

const type = (name: string, line = name): PayrollProvisionType => ({ name, line })

type ClusterProvisionTypes = {
  ordinary: readonly PayrollProvisionType[]
  integral?: readonly PayrollProvisionType[]
}

// Mirrors the allowed names in each legacy cluster's payment provisions repeater.
export const payrollProvisionTypes: Record<QuotationClusterKind, ClusterProvisionTypes> = {
  colombia: {
    ordinary: [
      type("Cesantias"),
      type("Intereses de Cesantias", "Interests over Cesantias"),
      type("Prima"),
      type("Indemnization"),
      type("Vacation"),
    ],
    integral: [type("Indemnization"), type("Vacation")],
  },
  canada: { ordinary: [type("Indemnification"), type("Vacation", "Vacations")] },
  brasil: { ordinary: [type("13th Salary"), type("Vacation"), type("Termination"), type("1/3 Vacation Bonus")] },
  chile: {
    ordinary: [type("Vacation", "Vacations"), type("Compensation for years of service"), type("Notice period")],
  },
  ecuador: {
    ordinary: [
      type("Vacation"),
      type("Reserve Fund"),
      type("Bonus 13th"),
      type("Bonus 14th"),
      type("25% Bonification"),
      type("Compensation"),
    ],
  },
  mexico: {
    ordinary: [
      type("13th Salary"),
      type("Vacation Prime - 25%", "Vacation Prime"),
      type("Vacation"),
      type("Indemnization 90 days"),
      type("Indemnization 20 days"),
      type("PTU"),
    ],
  },
  peru: {
    ordinary: [
      type("Gratification"),
      type("Extraordinary Gratification"),
      type("Vacation", "Vacations"),
      type("CTS"),
      type("Termination - Indemnification"),
    ],
  },
  uruguay: { ordinary: [type("13th Salary"), type("License"), type("Vacational Salary"), type("Dismissal")] },
  "costa-rica": {
    ordinary: [type("Unemployment"), type("Forewarning"), type("Bonus"), type("Vacation", "Vacations")],
  },
  hongkong: { ordinary: [type("Leave", "Leave Encashment")] },
}

export function allowedProvisionTypes(kind: QuotationClusterKind, isIntegral: boolean) {
  const types = payrollProvisionTypes[kind]
  return isIntegral && types.integral ? types.integral : types.ordinary
}

export function provisionTypeNames(kind: QuotationClusterKind) {
  const types = payrollProvisionTypes[kind]
  return [...new Set([...types.ordinary, ...(types.integral ?? [])].map(({ name }) => name))]
}

type PayrollRunOrder = { id: bigint; title: string; created_at: Date | null }

// The payroll date lives in the title, but older rows can hold free text there, so those fall back to when they
// were created; runs on the same date keep the order they were added in.
function payrollRunDate(run: PayrollRunOrder) {
  return quotationDateFromTitle(run.title) ?? run.created_at?.toISOString().slice(0, 10) ?? ""
}

export function comparePayrollRuns(a: PayrollRunOrder, b: PayrollRunOrder) {
  const byDate = payrollRunDate(a).localeCompare(payrollRunDate(b))
  if (byDate !== 0) return byDate
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

export function earlierPayrollRuns<T extends PayrollRunOrder>(runs: readonly T[], current: PayrollRunOrder): T[] {
  return runs.filter((run) => comparePayrollRuns(run, current) < 0).sort(comparePayrollRuns)
}

export type PayrollListItem = {
  id: string
  title: string
  variant: string | null
  isIntegral: boolean
  consultantId: string | null
  consultantName: string | null
  companyName: string
  currencyName: string
  billingCurrency: string
  grossSalary: string
  totalInvoice: number | null
}

export type ClusterPayrolls = {
  kind: QuotationClusterKind | null
  // One page of payroll runs matching the query.
  payrolls: PayrollListItem[]
  // How many runs match the query across all pages.
  total: number
  // Figures for the whole cluster, ignoring the query.
  stats: { payrolls: number; thisMonth: number; consultants: number }
  // Filter choices drawn from every run in the cluster.
  consultants: QuotationOption[]
  variants: string[]
}

export const payrollListQuerySchema = z.object({
  page: pageNumberSchema,
  search: listSearchSchema,
  // The start of the payroll date saved in the title, e.g. "2026-10", or "" for any month.
  month: z.union([z.literal(""), z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)]).catch(""),
  consultantId: z.string().regex(/^\d+$/).nullable().catch(null),
  variant: z.string().trim().min(1).max(50).nullable().catch(null),
})

export type PayrollListQuery = z.output<typeof payrollListQuerySchema>

export type PaidProvision = {
  provisionTypeId: string
  name: string
  amount: string
}

export type ProvisionLedgerFigures = {
  accrued: number
  previousPaid: number
  accumulated: number
  currentPaid: number
  balance: number
}

export type ProvisionLedgerRow = ProvisionLedgerFigures & { name: string }

export type ProvisionLedger = {
  previousRuns: number
  rows: ProvisionLedgerRow[]
  totals: ProvisionLedgerFigures
}

export type PayrollDetail = QuotationDetail & {
  consultantId: string | null
  consultantName: string | null
  provisions: PaidProvision[]
  ledger: ProvisionLedger | null
}

export type PayrollFormOptions = QuotationFormOptions & {
  consultants: QuotationOption[]
  provisionTypes: QuotationOption[]
}

export const payrollIdSchema = z.string().regex(/^\d+$/, "Invalid payroll id.")

const provisionAmount = z
  .string()
  .trim()
  .refine((value) => /^\d{1,13}(\.\d{1,2})?$/.test(normalizeSalary(value)), {
    message: "Enter each provision amount as a number, for example 1500.00.",
  })

export const payrollFormSchema = quotationFormSchema
  .extend({
    quotationDate: z.iso.date("Enter the payroll date."),
    consultantId: z.string().regex(/^\d+$/, "Choose a consultant."),
    provisions: z
      .array(
        z.object({
          provisionTypeId: z.string().regex(/^\d+$/, "Choose a provision type."),
          amount: provisionAmount,
        }),
      )
      .max(20, "Too many provision payments."),
  })
  .refine(
    (values) => new Set(values.provisions.map(({ provisionTypeId }) => provisionTypeId)).size === values.provisions.length,
    { path: ["provisions"], message: "Each provision type can only be paid once per payroll." },
  )

export type PayrollFormInput = z.input<typeof payrollFormSchema>

export type PayrollProvisionInput = PayrollFormInput["provisions"][number]

export function toPayrollFormInput(payroll: PayrollDetail | null): PayrollFormInput {
  return {
    ...toQuotationFormInput(payroll),
    consultantId: payroll?.consultantId ?? "",
    provisions: payroll?.provisions.map(({ provisionTypeId, amount }) => ({ provisionTypeId, amount })) ?? [],
  }
}
