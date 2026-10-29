import { describe, expect, it } from "vitest"
import {
  parseBreakdownSnapshot,
  payrollBreakdown,
  serializeBreakdownSnapshot,
  withProvisionKeys,
} from "@/lib/payroll/snapshot"
import type { QuotationRow } from "@/lib/quotations/breakdown"
import { calculateQuotation } from "@/lib/quotations/calculators"

const decimal = (value: number) => ({ toNumber: () => value }) as unknown as QuotationRow["fee"]

function canadaRow(grossSalary: number): QuotationRow & { breakdown_snapshot: string | null } {
  const zero = decimal(0)
  return {
    id: BigInt(1),
    title: "2026-01-01",
    company_id: BigInt(1),
    province_id: null,
    consultant_id: BigInt(1),
    currency_name: "CAD",
    exchange_rate: decimal(1),
    exchange_acronym: "CAD",
    gross_salary: decimal(grossSalary),
    is_fix_fee: false,
    fee: decimal(10),
    bank_fee: zero,
    bonus: zero,
    home_allowance: zero,
    transport_allowance: zero,
    medical_allowance: zero,
    internet_allowance: zero,
    family_allowance: zero,
    food_allowance: zero,
    legal_grafication: zero,
    dependent: false,
    is_integral: false,
    is_partner: false,
    created_at: null,
    companies: { name: "Acme" },
    countries: { name: "Canada" },
    provinces: null,
    partners: null,
    payroll_costs: [],
    breakdown_snapshot: null,
  }
}

describe("payroll breakdown snapshots", () => {
  it("tags provision lines with their provision type name", () => {
    const breakdown = withProvisionKeys(canadaBreakdownFor(1000), "canada")
    const lines = breakdown.sections.find((section) => section.title === "Provisions")?.lines ?? []
    expect(lines.find((line) => line.label === "Vacations")?.key).toBe("Vacation")
    expect(lines.find((line) => line.isTotal)?.key).toBeUndefined()
  })

  it("round-trips through JSON and rejects anything else", () => {
    const breakdown = canadaBreakdownFor(1000)
    expect(parseBreakdownSnapshot(serializeBreakdownSnapshot(breakdown))).toEqual(breakdown)
    expect(parseBreakdownSnapshot("{")).toBeNull()
    expect(parseBreakdownSnapshot(JSON.stringify({ version: 99, breakdown }))).toBeNull()
    expect(parseBreakdownSnapshot(null)).toBeNull()
  })

  it("shows the saved snapshot instead of recalculating", () => {
    const saved = serializeBreakdownSnapshot({ ...canadaBreakdownFor(1000), totalInvoice: 42 })
    expect(payrollBreakdown({ ...canadaRow(5000), breakdown_snapshot: saved }, "canada")?.totalInvoice).toBe(42)
  })

  it("calculates live for rows saved before snapshots existed", () => {
    const live = payrollBreakdown(canadaRow(5000), "canada")
    expect(live?.totalInvoice).toBeCloseTo(canadaBreakdownFor(5000).totalInvoice, 6)
  })

  it("doesn't price partner rows", () => {
    expect(payrollBreakdown({ ...canadaRow(5000), is_partner: true }, "canada")).toBeNull()
  })
})

function canadaBreakdownFor(grossSalary: number) {
  return calculateQuotation("canada", {
    companyId: "1",
    consultantId: "1",
    provinceName: null,
    isIntegral: false,
    exchangeRate: 1,
    grossSalary,
    isFixFee: false,
    fee: 10,
    bankFee: 0,
    bonus: 0,
    homeAllowance: 0,
    transportAllowance: 0,
    medicalAllowance: 0,
    internetAllowance: 0,
    familyAllowance: 0,
    foodAllowance: 0,
    legalGratification: 0,
    payrollCosts: { medicalInsurance: 0, meal: 0, transportation: 0, operationalCosts: 0, ufMonth: 0, eps: 0 },
  })
}
