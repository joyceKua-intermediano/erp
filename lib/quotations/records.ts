import "server-only"
import type { ActionResult } from "@/lib/action-result"
import { normalizeSalary } from "@/lib/contracts"
import { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import {
  quotationFields,
  quotationFormSchema,
  toQuotationClusterKind,
  type PayrollCostKey,
  type QuotationClusterKind,
  type QuotationFormInput,
} from "@/lib/quotations"

export type QuotationCluster = {
  label: string
  countryId: bigint
  kind: QuotationClusterKind | null
}

export async function findQuotationCluster(companyId: bigint): Promise<QuotationCluster | null> {
  const company = await prisma.intermediano_companies.findFirst({
    where: { id: companyId, deleted_at: null },
    select: { name: true, country_id: true, countries: { select: { name: true } } },
  })
  if (!company) return null

  return {
    label: company.name,
    countryId: company.country_id,
    kind: toQuotationClusterKind(company.countries.name),
  }
}

export { breakdownFor, quotationSelect, toNumber, type QuotationRow } from "@/lib/quotations/breakdown"

export function toAmount(value: Prisma.Decimal | null | undefined) {
  return value ? value.toString() : "0"
}

export type ExistingQuotation = {
  company_id: bigint
  dependent: boolean
}

export const payrollCostColumns = {
  medicalInsurance: "medical_insurance",
  meal: "meal",
  transportation: "transportation",
  ufMonth: "uf_month",
  eps: "eps",
} as const satisfies Record<PayrollCostKey, keyof Prisma.payroll_costsUncheckedCreateInput>

type PayrollCostsWriteData = Partial<Record<(typeof payrollCostColumns)[PayrollCostKey], string>>

export type QuotationWriteData = {
  quotation: Omit<Prisma.quotationsUncheckedCreateInput, "country_id" | "intermediano_company_id">
  payrollCosts: PayrollCostsWriteData | null
}

// Legacy copies these from the country's latest annual setup when the form fields change; payroll reads them later.
export async function annualSetupAmounts(
  kind: QuotationClusterKind,
  countryId: bigint,
  dependent: boolean,
  existing: ExistingQuotation | null,
): Promise<Pick<Prisma.quotationsUncheckedCreateInput, "uvt_amount" | "capped_amount">> {
  const isColombiaChange = kind === "colombia" && (existing === null || existing.dependent !== dependent)
  const isCanadaCreate = kind === "canada" && existing === null
  if (!isColombiaChange && !isCanadaCreate) return {}

  const setup = await prisma.country_annual_setups.findFirst({
    where: { country_id: countryId, deleted_at: null },
    orderBy: { year: "desc" },
    select: { uvt_amount: true, capped_amount: true },
  })

  if (isCanadaCreate) {
    return { uvt_amount: setup?.uvt_amount ?? 0, capped_amount: setup?.capped_amount ?? 0 }
  }
  return { capped_amount: dependent ? (setup?.capped_amount ?? 0) : 0 }
}

export async function validateQuotationInput(
  input: QuotationFormInput,
  cluster: QuotationCluster,
  existing: ExistingQuotation | null,
): Promise<ActionResult<QuotationWriteData>> {
  if (!cluster.kind) {
    return { ok: false, error: "Quotations for this cluster aren't available in the new app yet." }
  }
  const fields = quotationFields[cluster.kind]

  const parsed = quotationFormSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." }
  }
  const values = parsed.data

  const companyId = BigInt(values.companyId)
  if (companyId !== existing?.company_id) {
    const company = await prisma.companies.findFirst({ where: { id: companyId, deleted_at: null }, select: { id: true } })
    if (!company) return { ok: false, error: "The selected customer is no longer available." }
  }

  let provinceId: bigint | null = null
  if (fields.province) {
    if (!values.provinceId) return { ok: false, error: "Choose a province." }
    provinceId = BigInt(values.provinceId)
    const province = await prisma.provinces.findFirst({
      where: { id: provinceId, country_id: cluster.countryId, deleted_at: null },
      select: { id: true },
    })
    if (!province) return { ok: false, error: "The selected province isn't available for this cluster." }
  }

  return {
    ok: true,
    data: {
      quotation: {
        title: values.quotationDate,
        company_id: companyId,
        currency_name: values.currencyName,
        exchange_rate: normalizeSalary(values.exchangeRate),
        exchange_acronym: values.billingCurrency,
        gross_salary: normalizeSalary(values.grossSalary),
        is_fix_fee: values.feeType === "fixed",
        fee: normalizeSalary(values.fee),
        bank_fee: normalizeSalary(values.bankFee),
        bonus: normalizeSalary(values.bonus),
        home_allowance: normalizeSalary(values.homeAllowance),
        medical_allowance: normalizeSalary(values.medicalAllowance),
        internet_allowance: normalizeSalary(values.internetAllowance),
        dependent: values.dependent,
        ...(fields.transportAllowance && { transport_allowance: normalizeSalary(values.transportAllowance) }),
        ...(fields.familyAllowance && { family_allowance: normalizeSalary(values.familyAllowance) }),
        ...(fields.foodAllowance && { food_allowance: normalizeSalary(values.foodAllowance) }),
        ...(fields.legalGratification && { legal_grafication: normalizeSalary(values.legalGratification) }),
        ...(fields.quotationType && { is_integral: values.isIntegral }),
        ...(fields.province && { province_id: provinceId }),
        ...(await annualSetupAmounts(cluster.kind, cluster.countryId, values.dependent, existing)),
      },
      // Only this cluster's payroll cost columns are written, so other columns keep their saved values.
      payrollCosts:
        fields.payrollCosts.length > 0
          ? Object.fromEntries(
              fields.payrollCosts.map(({ key }) => [payrollCostColumns[key], normalizeSalary(values[key])]),
            )
          : null,
    },
  }
}
