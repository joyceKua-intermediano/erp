import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { payrollProvisionTypes } from "@/lib/payroll"
import { QUEBEC, quotationClusterKinds, type QuotationClusterKind } from "@/lib/quotations"
import { calculateQuotation } from "@/lib/quotations/calculators"
import type { QuotationBreakdown, QuotationFigures } from "@/lib/quotations/calculators/types"

const baseFigures: QuotationFigures = {
  companyId: "1",
  consultantId: "1",
  provinceName: null,
  isIntegral: false,
  exchangeRate: 1,
  grossSalary: 10_000,
  isFixFee: false,
  fee: 10,
  bankFee: 25,
  bonus: 500,
  homeAllowance: 100,
  transportAllowance: 100,
  medicalAllowance: 50,
  internetAllowance: 50,
  familyAllowance: 0,
  foodAllowance: 0,
  legalGratification: 0,
  payrollCosts: { medicalInsurance: 80, meal: 40, transportation: 30, operationalCosts: 20, ufMonth: 0, eps: 0 },
}

// Every pricing path the calculators take: the ordinary one per country, plus Colombia integral and Quebec.
const cases: { name: string; kind: QuotationClusterKind; figures: QuotationFigures }[] = [
  ...quotationClusterKinds.map((kind) => ({ name: kind, kind, figures: baseFigures })),
  { name: "colombia integral", kind: "colombia", figures: { ...baseFigures, isIntegral: true } },
  { name: "canada quebec", kind: "canada", figures: { ...baseFigures, provinceName: QUEBEC } },
]

function section(breakdown: QuotationBreakdown, title: string) {
  return breakdown.sections.find((item) => item.title === title)
}

describe.each(cases)("$name calculator", ({ kind, figures }) => {
  const breakdown = calculateQuotation(kind, figures)

  it("produces a finite, positive invoice", () => {
    expect(Number.isFinite(breakdown.totalInvoice)).toBe(true)
    expect(breakdown.totalInvoice).toBeGreaterThan(0)
    for (const { lines } of breakdown.sections) {
      for (const line of lines) expect(Number.isFinite(line.amount), line.label).toBe(true)
    }
  })

  it("has a provisions line for every provision type payroll can pay against", () => {
    const types = payrollProvisionTypes[kind]
    const allowed = figures.isIntegral && types.integral ? types.integral : types.ordinary
    const labels = section(breakdown, "Provisions")?.lines.filter((line) => !line.isTotal).map((line) => line.label)
    for (const type of allowed) expect(labels, `${type.name} → "${type.line}"`).toContain(type.line)
  })

  // Locks today's figures so an unintended calculator change shows up as a failing snapshot.
  it("keeps its current figures", () => {
    expect(breakdown).toMatchSnapshot()
  })
})

// Reference cases copied from the legacy Laravel app go in tests/fixtures/legacy-quotations/*.json:
//   { "kind": "colombia", "description": "…", "figures": { partial QuotationFigures },
//     "expected": { "totalInvoice": 1234.56, "lines": { "Provisions/Vacation": 12.34 } } }
const fixturesDir = path.join(__dirname, "fixtures", "legacy-quotations")
const fixtureFiles = existsSync(fixturesDir) ? readdirSync(fixturesDir).filter((file) => file.endsWith(".json")) : []

type LegacyFixture = {
  kind: QuotationClusterKind
  description?: string
  figures: Partial<QuotationFigures>
  expected: { totalInvoice: number; lines?: Record<string, number> }
}

describe.skipIf(fixtureFiles.length === 0)("matches the legacy app", () => {
  it.each(fixtureFiles)("%s", (file) => {
    const fixture = JSON.parse(readFileSync(path.join(fixturesDir, file), "utf8")) as LegacyFixture
    const breakdown = calculateQuotation(fixture.kind, {
      ...baseFigures,
      ...fixture.figures,
      payrollCosts: { ...baseFigures.payrollCosts, ...fixture.figures.payrollCosts },
    })

    expect(breakdown.totalInvoice).toBeCloseTo(fixture.expected.totalInvoice, 2)
    for (const [key, amount] of Object.entries(fixture.expected.lines ?? {})) {
      const [title, label] = key.split("/")
      const line = section(breakdown, title)?.lines.find((item) => item.label === label)
      expect(line?.amount, key).toBeCloseTo(amount, 2)
    }
  })
})
