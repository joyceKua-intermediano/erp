import { describe, expect, it } from "vitest"
import { allowedProvisionTypes, earlierPayrollRuns } from "@/lib/payroll"
import { buildProvisionLedger, type LedgerRun } from "@/lib/payroll/ledger"
import type { QuotationBreakdown } from "@/lib/quotations/calculators/types"

function provisions(lines: { label: string; amount: number; key?: string }[]): QuotationBreakdown {
  return {
    variant: "Ordinary",
    totalInvoice: 0,
    sections: [{ title: "Provisions", lines: [...lines, { label: "Total", amount: 0, isTotal: true }] }],
  }
}

describe("buildProvisionLedger", () => {
  const types = allowedProvisionTypes("canada", false)

  it("accrues earlier runs, subtracts earlier and current payments", () => {
    const previous: LedgerRun[] = [
      { breakdown: provisions([{ label: "Vacations", amount: 100 }]), paid: [] },
      { breakdown: provisions([{ label: "Vacations", amount: 100 }]), paid: [{ name: "Vacation", amount: 50 }] },
    ]
    const current: LedgerRun = {
      breakdown: provisions([{ label: "Vacations", amount: 100 }]),
      paid: [{ name: "Vacation", amount: 30 }],
    }

    const ledger = buildProvisionLedger(types, current, previous)
    const vacation = ledger.rows.find((row) => row.name === "Vacation")
    expect(ledger.previousRuns).toBe(2)
    expect(vacation).toEqual({
      name: "Vacation",
      accrued: 300,
      previousPaid: 50,
      accumulated: 250,
      currentPaid: 30,
      balance: 220,
    })
    expect(ledger.totals.balance).toBe(220)
  })

  it("matches lines by their stable key even after the label is renamed", () => {
    const renamed = provisions([{ label: "Vacation Pay", amount: 80, key: "Vacation" }])
    const ledger = buildProvisionLedger(types, { breakdown: renamed, paid: [] }, [])
    expect(ledger.rows.find((row) => row.name === "Vacation")?.accrued).toBe(80)
  })

  it("ignores total lines and runs that couldn't be priced", () => {
    const ledger = buildProvisionLedger(types, { breakdown: null, paid: [] }, [])
    expect(ledger.totals.accrued).toBe(0)
  })
})

describe("earlierPayrollRuns", () => {
  const run = (id: number, title: string, created = "2026-01-01") => ({
    id: BigInt(id),
    title,
    created_at: new Date(`${created}T00:00:00Z`),
  })

  it("orders by the payroll date in the title, not by the title text", () => {
    const current = run(10, "2026-03-01")
    const runs = [run(3, "2026-02-01"), run(1, "2026-01-15"), run(20, "2026-04-01")]
    expect(earlierPayrollRuns(runs, current).map((item) => item.id)).toEqual([BigInt(1), BigInt(3)])
  })

  it("dates free-text titles by when they were created", () => {
    const current = run(10, "2026-03-01")
    const legacy = run(2, "November payroll", "2025-11-30")
    const later = run(4, "Bonus run", "2026-05-01")
    expect(earlierPayrollRuns([later, legacy], current).map((item) => item.id)).toEqual([BigInt(2)])
  })

  it("keeps runs on the same date in the order they were added", () => {
    const current = run(5, "2026-03-01")
    const sameDay = [run(4, "2026-03-01"), run(6, "2026-03-01")]
    expect(earlierPayrollRuns(sameDay, current).map((item) => item.id)).toEqual([BigInt(4)])
  })
})
