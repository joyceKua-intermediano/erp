import { z } from "zod"
import { listSearchSchema, pageNumberSchema } from "./pagination"

// employee_expenses rows: one claim per row, its line items stored as a JSON array in `expenses`.
// Laravel still reads these rows, so the stored items keep legacy's keys exactly.

export const expenseStatuses = ["pending", "approved", "rejected"] as const

export type ExpenseStatus = (typeof expenseStatuses)[number]

export const expenseStatusLabels: Record<ExpenseStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
}

export function toExpenseStatus(value: unknown, fallback: ExpenseStatus = "pending"): ExpenseStatus {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : null
  return expenseStatuses.find((status) => status === normalized) ?? fallback
}

export const expenseTypes = ["local", "abroad"] as const

export type ExpenseType = (typeof expenseTypes)[number]

export const expenseTypeLabels: Record<ExpenseType, string> = {
  local: "Local",
  abroad: "Abroad",
}

export function toExpenseType(value: string | null): ExpenseType | null {
  return expenseTypes.find((type) => type === value?.trim().toLowerCase()) ?? null
}

export type ExpenseLine = {
  description: string
  // "YYYY-MM-DD", or null when a legacy item has no readable date.
  date: string | null
  amount: number | null
  federalAmount: number | null
  stateAmount: number | null
  // local_currency_include_taxes: what a local item counts towards the total.
  localTotal: number | null
  usd: number | null
  exchangeRate: number | null
  // usd × exchange_rate on abroad items.
  localCurrency: number | null
  // Path of the receipt under the storage root, e.g. "expense-receipts/12/<uuid>.jpg" or legacy "invoices/x.png".
  receipt: string | null
  status: ExpenseStatus
  comments: string
}

export type ExpenseTotals = {
  // In USD for abroad claims, otherwise in the claim's local currency.
  claimed: number
  approved: number
  // Local currency equivalent of an abroad claim.
  localEquivalent: number | null
}

export type ExpenseClaim = {
  id: string
  employeeId: string
  employeeName: string
  companyName: string | null
  type: ExpenseType | null
  costCenter: string | null
  currencyName: string | null
  createdBy: string
  status: ExpenseStatus
  submittedAt: string | null
  // Changes whenever the items or status change; saves and reviews are refused if it no longer matches.
  version: string
  lines: ExpenseLine[]
  totals: ExpenseTotals
}

export type MyExpenseClaims = {
  claims: ExpenseClaim[]
  // Null without a contract, since legacy takes the customer and currency from it.
  contract: { customerName: string | null; currencyName: string | null; hasCustomer: boolean } | null
}

export type ClusterExpenseClaims = {
  // One page of claims matching the query.
  claims: ExpenseClaim[]
  // How many claims match the query across all pages.
  total: number
  // Figures for the whole cluster, ignoring the query.
  stats: { claims: number; pending: number; employees: number }
}

export const expenseListQuerySchema = z.object({
  page: pageNumberSchema,
  search: listSearchSchema,
  status: z.enum(expenseStatuses).nullable().catch(null),
})

export type ExpenseListQuery = z.output<typeof expenseListQuerySchema>

export const expenseIdSchema = z.string().regex(/^\d+$/, "Invalid expense claim id.")

export const MAX_EXPENSE_LINES = 100

const MAX_AMOUNT = 10_000_000_000

const amountSchema = z
  .number("Enter a valid amount.")
  .min(0, "Amounts can't be negative.")
  .max(MAX_AMOUNT, "That amount is too large.")
  .nullable()

const dateValueSchema = z
  .string("Choose a date.")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date for each expense.")
  .refine((value) => new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value, "Choose a valid date.")

const storedIndexSchema = z.number().int().min(0).max(MAX_EXPENSE_LINES * 10)

// An item the employee didn't touch: it is kept exactly as stored, review included.
export const keptExpenseLineSchema = z.object({
  index: storedIndexSchema,
  keep: z.literal(true),
})

export const expenseLineInputSchema = z.object({
  // Position of the item in the stored claim, or null for a new item.
  index: storedIndexSchema.nullable(),
  description: z.string().trim().min(1, "Describe each expense.").max(500, "Keep descriptions under 500 characters."),
  date: dateValueSchema,
  amount: amountSchema,
  federalAmount: amountSchema,
  stateAmount: amountSchema,
  localTotal: amountSchema,
  usd: amountSchema,
  exchangeRate: amountSchema,
  receipt: z.string("Attach a receipt to each expense.").min(1, "Attach a receipt to each expense.").max(255),
})

export type ExpenseLineInput = z.input<typeof expenseLineInputSchema>

export const expenseClaimFormSchema = z
  .object({
    type: z.enum(expenseTypes, "Choose whether these expenses are local or abroad."),
    costCenter: z.string().trim().max(255, "Keep the cost center under 255 characters."),
    currencyName: z.string().trim().max(20, "Keep the currency under 20 characters."),
    lines: z
      .array(z.union([keptExpenseLineSchema, expenseLineInputSchema]))
      .min(1, "Add at least one expense.")
      .max(MAX_EXPENSE_LINES, `A claim can have at most ${MAX_EXPENSE_LINES} expenses.`),
    // The claim's version when the form was loaded; null for a new claim.
    version: z.string().max(64).nullable(),
  })
  .superRefine((values, context) => {
    values.lines.forEach((line, position) => {
      if ("keep" in line) return
      if (values.type === "local" && !(line.localTotal && line.localTotal > 0)) {
        context.addIssue({
          code: "custom",
          path: ["lines", position, "localTotal"],
          message: `Enter the total including taxes for expense ${position + 1}.`,
        })
      }
      if (values.type === "abroad" && !(line.usd && line.usd > 0)) {
        context.addIssue({ code: "custom", path: ["lines", position, "usd"], message: `Enter the USD amount for expense ${position + 1}.` })
      }
      if (values.type === "abroad" && !(line.exchangeRate && line.exchangeRate > 0)) {
        context.addIssue({
          code: "custom",
          path: ["lines", position, "exchangeRate"],
          message: `Enter the exchange rate for expense ${position + 1}.`,
        })
      }
    })
  })

export type ExpenseClaimFormInput = z.input<typeof expenseClaimFormSchema>
export type ExpenseClaimFormValues = z.output<typeof expenseClaimFormSchema>

export const expenseReviewSchema = z.object({
  index: z.number().int().min(0),
  status: z.enum(["approved", "rejected"], "Choose whether to approve or reject this expense."),
  comments: z.string().trim().max(1000, "Keep comments under 1000 characters."),
  version: z.string().min(1).max(64),
})

export type ExpenseReviewInput = z.input<typeof expenseReviewSchema>

// Legacy's inputs saved numbers as strings, and its total-with-taxes field was plain text ("1.234,56", "R$ 100").
export function parseAmount(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null
  if (typeof raw !== "string") return null
  let text = raw.replace(/[^\d.,-]/g, "")
  if (!/\d/.test(text)) return null
  const lastComma = text.lastIndexOf(",")
  const lastDot = text.lastIndexOf(".")
  if (lastComma !== -1 && lastDot !== -1) {
    // Whichever separator comes last is the decimal one.
    text = lastComma > lastDot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "")
  } else if (lastComma !== -1) {
    text = text.indexOf(",") === lastComma ? text.replace(",", ".") : text.replace(/,/g, "")
  }
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}

function parseDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const value = raw.trim().slice(0, 10)
  return dateValueSchema.safeParse(value).success ? value : null
}

// Filament saved a single upload as a string, but its state can also be an array or a uuid-keyed object.
function parseReceipt(raw: unknown): string | null {
  if (typeof raw === "string") return raw.trim() || null
  if (raw && typeof raw === "object") {
    const first = Object.values(raw).find((value): value is string => typeof value === "string" && value.trim() !== "")
    return first?.trim() ?? null
  }
  return null
}

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
}

// Laravel's array cast stores JSON; tolerate rows that were double-encoded or aren't an array at all.
export function parseStoredItems(raw: string | null): Record<string, unknown>[] {
  if (!raw) return []
  try {
    let value: unknown = JSON.parse(raw)
    if (typeof value === "string") value = JSON.parse(value)
    if (Array.isArray(value)) return value.map(asRecord)
    if (value && typeof value === "object") return Object.values(value).map(asRecord)
    return []
  } catch {
    return []
  }
}

// Items on admin-created legacy claims have no status of their own and follow the claim's.
export function toExpenseLine(item: Record<string, unknown>, fallbackStatus: ExpenseStatus = "pending"): ExpenseLine {
  return {
    description: typeof item.description === "string" ? item.description : "",
    date: parseDate(item.date),
    amount: parseAmount(item.amount),
    federalAmount: parseAmount(item.federal_amount),
    stateAmount: parseAmount(item.state_amount),
    localTotal: parseAmount(item.local_currency_include_taxes),
    usd: parseAmount(item.usd),
    exchangeRate: parseAmount(item.exchange_rate),
    localCurrency: parseAmount(item.local_currency),
    receipt: parseReceipt(item.invoice),
    status: toExpenseStatus(item.status, fallbackStatus),
    comments: typeof item.comments === "string" ? item.comments : "",
  }
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

export function abroadLocalAmount(usd: number | null, exchangeRate: number | null) {
  return usd !== null && exchangeRate !== null ? roundMoney(usd * exchangeRate) : null
}

// Writes an item back with legacy's keys; `item` is the 1-based counter legacy shows.
export function toStoredExpenseItem(line: ExpenseLine, type: ExpenseType, position: number): Record<string, unknown> {
  const isLocal = type === "local"
  return {
    item: position + 1,
    description: line.description,
    date: line.date,
    amount: isLocal ? line.amount : null,
    federal_amount: isLocal ? line.federalAmount : null,
    state_amount: isLocal ? line.stateAmount : null,
    local_currency_include_taxes: isLocal ? line.localTotal : null,
    usd: isLocal ? null : line.usd,
    exchange_rate: isLocal ? null : line.exchangeRate,
    local_currency: isLocal ? null : abroadLocalAmount(line.usd, line.exchangeRate),
    invoice: line.receipt,
    status: line.status,
    comments: line.comments,
  }
}

function lineAmount(line: ExpenseLine, type: ExpenseType | null) {
  return (type === "abroad" ? line.usd : line.localTotal) ?? 0
}

// Legacy totals local claims by total-with-taxes and abroad claims by USD.
export function claimTotals(type: ExpenseType | null, lines: ExpenseLine[]): ExpenseTotals {
  let claimed = 0
  let approved = 0
  let localEquivalent = 0
  for (const line of lines) {
    const amount = lineAmount(line, type)
    claimed += amount
    if (line.status === "approved") approved += amount
    localEquivalent += line.localCurrency ?? abroadLocalAmount(line.usd, line.exchangeRate) ?? 0
  }
  return {
    claimed: roundMoney(claimed),
    approved: roundMoney(approved),
    localEquivalent: type === "abroad" ? roundMoney(localEquivalent) : null,
  }
}

// Legacy approves the claim once every item is approved; a claim whose items were all reviewed with
// at least one rejection is rejected, and anything still waiting keeps it pending.
export function rollupClaimStatus(statuses: readonly ExpenseStatus[]): ExpenseStatus {
  if (statuses.length === 0) return "pending"
  if (statuses.every((status) => status === "approved")) return "approved"
  if (statuses.some((status) => status === "pending")) return "pending"
  return "rejected"
}

// Legacy's "quick approve": every item still waiting is approved, and reviewed items keep their decision and comments.
export function approvePendingItems(storedItems: Record<string, unknown>[]) {
  let approved = 0
  const items = storedItems.map((item) => {
    if (toExpenseLine(item).status !== "pending") return item
    approved++
    return { ...item, status: "approved" }
  })
  return { items, approved, status: rollupClaimStatus(items.map((item) => toExpenseLine(item).status)) }
}

export type ClaimItemsResult =
  | { ok: true; items: Record<string, unknown>[]; status: ExpenseStatus; newReceipts: string[] }
  | { ok: false; error: string }

const CLAIM_CHANGED_ERROR = "This claim changed since you opened it. Reload and try again."

// Applies an employee's form to the stored items: kept items stay exactly as stored with their review,
// approved items can't be edited or removed, and new or edited items go back to pending.
// Pass no stored items for a new claim.
export function buildEmployeeClaimItems(
  storedItems: Record<string, unknown>[],
  storedType: ExpenseType | null,
  values: ExpenseClaimFormValues,
  employeeId: bigint | string,
  fallbackStatus: ExpenseStatus = "pending",
): ClaimItemsResult {
  const storedLines = storedItems.map((item) => toExpenseLine(item, fallbackStatus))
  const hasApproved = storedLines.some((line) => line.status === "approved")
  if (hasApproved && storedType !== values.type) {
    return { ok: false, error: "Some expenses are already approved, so the claim can't switch between local and abroad." }
  }

  const used = new Set<number>()
  const items: Record<string, unknown>[] = []
  const statuses: ExpenseStatus[] = []
  const newReceipts: string[] = []

  for (const [position, input] of values.lines.entries()) {
    const index = input.index
    const stored = index === null ? undefined : storedLines[index]
    if (index !== null) {
      if (!stored || used.has(index)) return { ok: false, error: CLAIM_CHANGED_ERROR }
      used.add(index)
    }

    if ("keep" in input) {
      if (!stored) return { ok: false, error: CLAIM_CHANGED_ERROR }
      // A kept item's amounts were entered for the stored type, so it must be re-entered after switching.
      if (stored.status !== "approved" && storedType !== values.type) {
        return { ok: false, error: `Check expense ${position + 1} again: its amounts were entered for a different claim type.` }
      }
      items.push({ ...storedItems[input.index], item: position + 1 })
      statuses.push(stored.status)
      continue
    }

    if (stored?.status === "approved") return { ok: false, error: "Approved expenses can't be changed." }

    if (input.receipt !== stored?.receipt) {
      if (!isEmployeeReceiptPath(input.receipt, employeeId)) {
        return { ok: false, error: `Upload the receipt for expense ${position + 1} again.` }
      }
      newReceipts.push(input.receipt)
    }

    const line: ExpenseLine = {
      description: input.description,
      date: input.date,
      amount: input.amount,
      federalAmount: input.federalAmount,
      stateAmount: input.stateAmount,
      localTotal: input.localTotal,
      usd: input.usd,
      exchangeRate: input.exchangeRate,
      localCurrency: abroadLocalAmount(input.usd, input.exchangeRate),
      receipt: input.receipt,
      status: "pending",
      comments: stored?.comments ?? "",
    }

    items.push(toStoredExpenseItem(line, values.type, position))
    statuses.push(line.status)
  }

  if (storedLines.some((line, index) => line.status === "approved" && !used.has(index))) {
    return { ok: false, error: "Approved expenses can't be removed from the claim." }
  }

  return { ok: true, items, status: rollupClaimStatus(statuses), newReceipts }
}

export function isClaimLocked(claim: Pick<ExpenseClaim, "status" | "lines">) {
  return claim.status === "approved" || (claim.lines.length > 0 && claim.lines.every((line) => line.status === "approved"))
}

export function claimCurrency(claim: Pick<ExpenseClaim, "type" | "currencyName">) {
  if (claim.type === "abroad") return "USD"
  return claim.currencyName?.trim() || null
}

// Legacy's list label: "Expenses 03-2025_BRL".
export function expenseClaimTitle(claim: Pick<ExpenseClaim, "type" | "currencyName" | "submittedAt">) {
  const currency = claimCurrency(claim) ?? "—"
  if (!claim.submittedAt) return `Expenses ${currency}`
  const date = new Date(claim.submittedAt)
  return `Expenses ${String(date.getUTCMonth() + 1).padStart(2, "0")}-${date.getUTCFullYear()}_${currency}`
}

export function formatMoney(value: number, currency: string | null) {
  const code = currency?.trim().toUpperCase() ?? ""
  if (/^[A-Z]{3}$/.test(code)) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(value)
    } catch {
      // Not an ISO currency code; fall through to a plain number.
    }
  }
  const text = value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return code ? `${text} ${code}` : text
}

export function formatExpenseDate(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`))
}

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024

export const receiptImageTypes = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
} as const

export type ReceiptImageType = keyof typeof receiptImageTypes

export const RECEIPT_ACCEPT = Object.values(receiptImageTypes).join(",")

// Checks the file's leading bytes rather than trusting its name or the browser's content type.
export function detectImageType(bytes: Uint8Array): ReceiptImageType | null {
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => bytes[i] === byte)) return "png"
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg"
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  ) {
    return "webp"
  }
  return null
}

export const RECEIPT_DIRECTORY = "expense-receipts"

const receiptFilePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/

export function receiptPathFor(employeeId: bigint | string, fileName: string) {
  return `${RECEIPT_DIRECTORY}/${employeeId}/${fileName}`
}

// A receipt uploaded through the new app by this employee; anything else must already be on the stored item.
export function isEmployeeReceiptPath(path: string, employeeId: bigint | string) {
  const prefix = `${RECEIPT_DIRECTORY}/${employeeId}/`
  return path.startsWith(prefix) && receiptFilePattern.test(path.slice(prefix.length))
}

export function receiptUrl(expenseId: string, index: number, clusterId?: string | null) {
  const base = `/api/expenses/${expenseId}/receipts/${index}`
  return clusterId ? `${base}?cluster=${encodeURIComponent(clusterId)}` : base
}

export function customerReceiptUrl(expenseId: string, index: number) {
  return `/api/expenses/${expenseId}/receipts/${index}?as=customer`
}
