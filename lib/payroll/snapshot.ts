import { payrollProvisionTypes } from "@/lib/payroll"
import type { QuotationClusterKind } from "@/lib/quotations"
import { breakdownFor, type QuotationRow } from "@/lib/quotations/breakdown"
import type { BreakdownSection, QuotationBreakdown } from "@/lib/quotations/calculators/types"

// A payroll's breakdown is saved when the payroll is saved, so later changes to a calculator's rates or labels
// don't rewrite figures that were already billed.

const SNAPSHOT_VERSION = 1
export const PROVISIONS_SECTION = "Provisions"

type BreakdownSnapshot = { version: typeof SNAPSHOT_VERSION; breakdown: QuotationBreakdown }

// Tags provision lines with their provision type name, the id payments are saved against.
export function withProvisionKeys(breakdown: QuotationBreakdown, kind: QuotationClusterKind): QuotationBreakdown {
  const types = payrollProvisionTypes[kind]
  const keyByLine = new Map([...types.ordinary, ...(types.integral ?? [])].map(({ name, line }) => [line, name]))

  const sections = breakdown.sections.map((section): BreakdownSection => {
    if (section.title !== PROVISIONS_SECTION) return section
    return {
      ...section,
      lines: section.lines.map((line) => {
        const key = line.isTotal ? undefined : keyByLine.get(line.label)
        return key && !line.key ? { ...line, key } : line
      }),
    }
  })
  return { ...breakdown, sections }
}

export function serializeBreakdownSnapshot(breakdown: QuotationBreakdown): string {
  return JSON.stringify({ version: SNAPSHOT_VERSION, breakdown } satisfies BreakdownSnapshot)
}

function isBreakdown(value: unknown): value is QuotationBreakdown {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<QuotationBreakdown>
  return (
    typeof candidate.variant === "string" &&
    typeof candidate.totalInvoice === "number" &&
    Array.isArray(candidate.sections) &&
    candidate.sections.every(
      (section) =>
        section &&
        typeof section.title === "string" &&
        Array.isArray(section.lines) &&
        section.lines.every((line) => line && typeof line.label === "string" && typeof line.amount === "number")
    )
  )
}

// Null when there's no usable snapshot, so callers fall back to calculating.
export function parseBreakdownSnapshot(raw: string | null | undefined): QuotationBreakdown | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<BreakdownSnapshot>
    return parsed.version === SNAPSHOT_VERSION && isBreakdown(parsed.breakdown) ? parsed.breakdown : null
  } catch {
    return null
  }
}

// What a payroll row shows: its saved snapshot, or a live calculation for rows saved before snapshots existed.
export function payrollBreakdown(
  row: QuotationRow & { breakdown_snapshot: string | null },
  kind: QuotationClusterKind | null
): QuotationBreakdown | null {
  if (!kind || row.is_partner) return null
  const snapshot = parseBreakdownSnapshot(row.breakdown_snapshot)
  if (snapshot) return withProvisionKeys(snapshot, kind)
  const live = breakdownFor(row, kind)
  return live ? withProvisionKeys(live, kind) : null
}

// The snapshot to save for a payroll row, or null when it can't be priced.
export function snapshotForRow(row: QuotationRow, kind: QuotationClusterKind | null): string | null {
  if (!kind) return null
  const breakdown = breakdownFor(row, kind)
  return breakdown ? serializeBreakdownSnapshot(withProvisionKeys(breakdown, kind)) : null
}
