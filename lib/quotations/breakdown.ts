import type { Prisma } from "@/lib/generated/prisma/client"
import { QUEBEC, type QuotationClusterKind } from "@/lib/quotations"
import { calculateQuotation } from "@/lib/quotations/calculators"

// Kept free of server-only imports so scripts and tests can price saved rows too.

export const quotationSelect = {
  id: true,
  title: true,
  company_id: true,
  province_id: true,
  consultant_id: true,
  currency_name: true,
  exchange_rate: true,
  exchange_acronym: true,
  gross_salary: true,
  is_fix_fee: true,
  fee: true,
  bank_fee: true,
  bonus: true,
  home_allowance: true,
  transport_allowance: true,
  medical_allowance: true,
  internet_allowance: true,
  family_allowance: true,
  food_allowance: true,
  legal_grafication: true,
  dependent: true,
  is_integral: true,
  is_partner: true,
  created_at: true,
  companies: { select: { name: true } },
  countries: { select: { name: true } },
  provinces: { select: { name: true } },
  partners: { select: { partner_name: true } },
  // Legacy treats payroll costs as a hasOne relation.
  payroll_costs: {
    where: { deleted_at: null },
    orderBy: { id: "asc" },
    take: 1,
    select: {
      id: true,
      medical_insurance: true,
      meal: true,
      transportation: true,
      operational_costs: true,
      uf_month: true,
      eps: true,
    },
  },
} satisfies Prisma.quotationsSelect

export type QuotationRow = Prisma.quotationsGetPayload<{ select: typeof quotationSelect }>

// Each calculator's `variant` follows from saved columns (see calculateQuotation), so lists can filter on it in SQL.
const ORDINARY = "Ordinary"
const NO_ROWS = { id: { in: [] } } satisfies Prisma.quotationsWhereInput

export function breakdownVariants(kind: QuotationClusterKind): string[] {
  if (kind === "colombia") return [ORDINARY, "Integral"]
  if (kind === "canada") return ["Canada", QUEBEC]
  return [ORDINARY]
}

export function variantWhere(kind: QuotationClusterKind, variant: string): Prisma.quotationsWhereInput {
  if (kind === "colombia") {
    if (variant === ORDINARY) return { is_integral: false }
    return variant === "Integral" ? { is_integral: true } : NO_ROWS
  }
  if (kind === "canada") {
    if (variant === QUEBEC) return { provinces: { is: { name: QUEBEC } } }
    return variant === "Canada" ? { OR: [{ province_id: null }, { provinces: { is: { name: { not: QUEBEC } } } }] } : NO_ROWS
  }
  return variant === ORDINARY ? {} : NO_ROWS
}

export function toNumber(value: Prisma.Decimal | null | undefined) {
  return value ? value.toNumber() : 0
}

export function breakdownFor(row: QuotationRow, kind: QuotationClusterKind | null) {
  // Partner rows are priced by their destination country, whose calculators aren't ported yet.
  if (!kind || row.is_partner) return null
  const [payrollCosts] = row.payroll_costs
  return calculateQuotation(kind, {
    companyId: row.company_id.toString(),
    consultantId: row.consultant_id?.toString() ?? null,
    provinceName: row.provinces?.name ?? null,
    isIntegral: row.is_integral,
    exchangeRate: toNumber(row.exchange_rate),
    grossSalary: toNumber(row.gross_salary),
    isFixFee: row.is_fix_fee,
    fee: toNumber(row.fee),
    bankFee: toNumber(row.bank_fee),
    bonus: toNumber(row.bonus),
    homeAllowance: toNumber(row.home_allowance),
    transportAllowance: toNumber(row.transport_allowance),
    medicalAllowance: toNumber(row.medical_allowance),
    internetAllowance: toNumber(row.internet_allowance),
    familyAllowance: toNumber(row.family_allowance),
    foodAllowance: toNumber(row.food_allowance),
    legalGratification: toNumber(row.legal_grafication),
    payrollCosts: {
      medicalInsurance: toNumber(payrollCosts?.medical_insurance),
      meal: toNumber(payrollCosts?.meal),
      transportation: toNumber(payrollCosts?.transportation),
      operationalCosts: toNumber(payrollCosts?.operational_costs),
      ufMonth: toNumber(payrollCosts?.uf_month),
      eps: toNumber(payrollCosts?.eps),
    },
  })
}
