import type { PayrollProvisionType, ProvisionLedger, ProvisionLedgerFigures } from "@/lib/payroll"
import type { QuotationBreakdown } from "@/lib/quotations/calculators/types"

export type LedgerRun = {
  breakdown: QuotationBreakdown | null
  paid: { name: string; amount: number }[]
}

// Lines are matched by their stable key first, so a renamed label still finds older runs' provisions.
function provisionAmount(breakdown: QuotationBreakdown | null, { name, line: label }: PayrollProvisionType) {
  const section = breakdown?.sections.find(({ title }) => title === "Provisions")
  const lines = section?.lines.filter((line) => !line.isTotal) ?? []
  const match = lines.find((line) => line.key === name) ?? lines.find((line) => !line.key && line.label === label)
  return match?.amount ?? 0
}

function paidAmount(run: LedgerRun, name: string) {
  return run.paid.reduce((sum, payment) => (payment.name === name ? sum + payment.amount : sum), 0)
}

// Accumulated = everything accrued so far minus earlier payments; balance also takes off this run's payments.
export function buildProvisionLedger(
  types: readonly PayrollProvisionType[],
  current: LedgerRun,
  previous: LedgerRun[],
): ProvisionLedger {
  const totals: ProvisionLedgerFigures = { accrued: 0, previousPaid: 0, accumulated: 0, currentPaid: 0, balance: 0 }

  const rows = types.map((type) => {
    const { name } = type
    const accrued = [...previous, current].reduce((sum, run) => sum + provisionAmount(run.breakdown, type), 0)
    const previousPaid = previous.reduce((sum, run) => sum + paidAmount(run, name), 0)
    const accumulated = accrued - previousPaid
    const currentPaid = paidAmount(current, name)
    const balance = accumulated - currentPaid

    totals.accrued += accrued
    totals.previousPaid += previousPaid
    totals.accumulated += accumulated
    totals.currentPaid += currentPaid
    totals.balance += balance
    return { name, accrued, previousPaid, accumulated, currentPaid, balance }
  })

  return { previousRuns: previous.length, rows, totals }
}
