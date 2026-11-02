import { describe, expect, it } from "vitest"
import {
  buildEmployeeClaimItems,
  claimTotals,
  detectImageType,
  expenseClaimFormSchema,
  expenseClaimTitle,
  isEmployeeReceiptPath,
  parseAmount,
  parseStoredItems,
  rollupClaimStatus,
  toExpenseLine,
  toStoredExpenseItem,
  type ExpenseClaimFormValues,
} from "@/lib/expenses"

const EMPLOYEE_ID = BigInt(12)
const RECEIPT = "expense-receipts/12/0f8fad5b-d9cb-469f-a165-70867728950e.jpg"
const OTHER_RECEIPT = "expense-receipts/12/7c9e6679-7425-40de-944b-e07fc1f90ae7.png"

const legacyLocalItem = {
  item: 1,
  description: "Taxi",
  date: "2025-03-21",
  amount: "100",
  federal_amount: "5",
  state_amount: "3",
  local_currency_include_taxes: "1.234,56",
  invoice: "invoices/taxi.png",
  status: "rejected",
  comments: "Blurry receipt",
}

function formValues(lines: ExpenseClaimFormValues["lines"], type: "local" | "abroad" = "local"): ExpenseClaimFormValues {
  return { type, costCenter: "", currencyName: "BRL", lines, version: null }
}

function newLocalLine(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    index: null,
    description: "Lunch",
    date: "2026-10-01",
    amount: null,
    federalAmount: null,
    stateAmount: null,
    localTotal: 50,
    usd: null,
    exchangeRate: null,
    receipt: RECEIPT,
    ...overrides,
  } as ExpenseClaimFormValues["lines"][number]
}

describe("parseAmount", () => {
  it("reads legacy numbers saved as strings in either decimal style", () => {
    expect(parseAmount(12.5)).toBe(12.5)
    expect(parseAmount("100")).toBe(100)
    expect(parseAmount("12,50")).toBe(12.5)
    expect(parseAmount("1.234,56")).toBe(1234.56)
    expect(parseAmount("1,234.56")).toBe(1234.56)
    expect(parseAmount("R$ 100")).toBe(100)
    expect(parseAmount("1,234,567")).toBe(1234567)
  })

  it("returns null for empty or unreadable values", () => {
    expect(parseAmount("")).toBeNull()
    expect(parseAmount("abc")).toBeNull()
    expect(parseAmount(null)).toBeNull()
    expect(parseAmount(Number.NaN)).toBeNull()
  })
})

describe("parseStoredItems and toExpenseLine", () => {
  it("parses legacy JSON, including double-encoded rows", () => {
    const json = JSON.stringify([legacyLocalItem])
    expect(parseStoredItems(json)).toHaveLength(1)
    expect(parseStoredItems(JSON.stringify(json))).toHaveLength(1)
    expect(parseStoredItems("not json")).toEqual([])
    expect(parseStoredItems(null)).toEqual([])
  })

  it("maps legacy keys and accepts the receipt as a string, array or object", () => {
    const line = toExpenseLine(legacyLocalItem)
    expect(line).toMatchObject({
      description: "Taxi",
      date: "2025-03-21",
      amount: 100,
      localTotal: 1234.56,
      receipt: "invoices/taxi.png",
      status: "rejected",
      comments: "Blurry receipt",
    })
    expect(toExpenseLine({ invoice: ["invoices/a.png"] }).receipt).toBe("invoices/a.png")
    expect(toExpenseLine({ invoice: { "uuid-1": "invoices/b.png" } }).receipt).toBe("invoices/b.png")
  })

  it("lets items without a status follow the claim", () => {
    expect(toExpenseLine({}).status).toBe("pending")
    expect(toExpenseLine({}, "approved").status).toBe("approved")
    expect(toExpenseLine({ status: "Approved" }).status).toBe("approved")
  })
})

describe("toStoredExpenseItem", () => {
  it("round-trips through legacy keys", () => {
    const line = toExpenseLine(legacyLocalItem)
    const stored = toStoredExpenseItem(line, "local", 0)
    expect(Object.keys(stored).sort()).toEqual(
      [
        "item",
        "description",
        "date",
        "amount",
        "federal_amount",
        "state_amount",
        "local_currency_include_taxes",
        "usd",
        "exchange_rate",
        "local_currency",
        "invoice",
        "status",
        "comments",
      ].sort()
    )
    expect(toExpenseLine(stored)).toEqual(line)
  })

  it("computes the local amount of abroad items", () => {
    const line = toExpenseLine({ usd: 10, exchange_rate: 5.25 })
    expect(toStoredExpenseItem(line, "abroad", 2)).toMatchObject({ item: 3, usd: 10, exchange_rate: 5.25, local_currency: 52.5 })
  })
})

describe("claimTotals", () => {
  it("totals local claims by total including taxes", () => {
    const lines = [
      toExpenseLine({ local_currency_include_taxes: 10.1, status: "approved" }),
      toExpenseLine({ local_currency_include_taxes: 20.2 }),
    ]
    expect(claimTotals("local", lines)).toEqual({ claimed: 30.3, approved: 10.1, localEquivalent: null })
  })

  it("totals abroad claims in USD with their local equivalent", () => {
    const lines = [toExpenseLine({ usd: 10, exchange_rate: 5 }), toExpenseLine({ usd: 5, local_currency: 30, status: "approved" })]
    expect(claimTotals("abroad", lines)).toEqual({ claimed: 15, approved: 5, localEquivalent: 80 })
  })
})

describe("rollupClaimStatus", () => {
  it("approves only when every item is approved", () => {
    expect(rollupClaimStatus(["approved", "approved"])).toBe("approved")
    expect(rollupClaimStatus(["approved", "pending"])).toBe("pending")
    expect(rollupClaimStatus(["approved", "rejected"])).toBe("rejected")
    expect(rollupClaimStatus(["rejected", "pending"])).toBe("pending")
    expect(rollupClaimStatus([])).toBe("pending")
  })
})

describe("expenseClaimTitle", () => {
  it("uses legacy's month and currency label", () => {
    expect(expenseClaimTitle({ type: "local", currencyName: "BRL", submittedAt: "2025-03-21T10:00:00.000Z" })).toBe(
      "Expenses 03-2025_BRL"
    )
    expect(expenseClaimTitle({ type: "abroad", currencyName: "BRL", submittedAt: "2025-11-02T10:00:00.000Z" })).toBe(
      "Expenses 11-2025_USD"
    )
  })
})

describe("expenseClaimFormSchema", () => {
  it("requires the amounts of the chosen type", () => {
    expect(expenseClaimFormSchema.safeParse(formValues([newLocalLine()])).success).toBe(true)
    expect(expenseClaimFormSchema.safeParse(formValues([newLocalLine({ localTotal: null })])).success).toBe(false)
    expect(expenseClaimFormSchema.safeParse(formValues([newLocalLine()], "abroad")).success).toBe(false)
    expect(
      expenseClaimFormSchema.safeParse(formValues([newLocalLine({ usd: 10, exchangeRate: 5 })], "abroad")).success
    ).toBe(true)
  })

  it("accepts kept items without their values", () => {
    expect(expenseClaimFormSchema.safeParse(formValues([{ index: 0, keep: true }])).success).toBe(true)
  })
})

describe("buildEmployeeClaimItems", () => {
  const approved = { ...legacyLocalItem, description: "Hotel", status: "approved", comments: "" }
  const stored = [legacyLocalItem, approved]

  it("creates pending items for a new claim", () => {
    const result = buildEmployeeClaimItems([], null, formValues([newLocalLine()]), EMPLOYEE_ID)
    expect(result).toMatchObject({ ok: true, status: "pending", newReceipts: [RECEIPT] })
    if (result.ok) expect(result.items[0]).toMatchObject({ item: 1, description: "Lunch", status: "pending", invoice: RECEIPT })
  })

  it("refuses receipts the employee didn't upload", () => {
    const result = buildEmployeeClaimItems([], null, formValues([newLocalLine({ receipt: "invoices/someone-else.png" })]), EMPLOYEE_ID)
    expect(result.ok).toBe(false)
  })

  it("keeps untouched items exactly as stored and sends edited ones back for review", () => {
    const values = formValues([
      newLocalLine({ index: 0, receipt: "invoices/taxi.png", description: "Taxi (fixed)" }),
      { index: 1, keep: true },
    ])
    const result = buildEmployeeClaimItems(stored, "local", values, EMPLOYEE_ID)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.newReceipts).toEqual([])
    expect(result.items[0]).toMatchObject({ description: "Taxi (fixed)", status: "pending", comments: "Blurry receipt" })
    expect(result.items[1]).toEqual({ ...approved, item: 2 })
    expect(result.status).toBe("pending")
  })

  it("keeps a rejected item's review when it isn't touched", () => {
    const result = buildEmployeeClaimItems(stored, "local", formValues([{ index: 0, keep: true }, { index: 1, keep: true }]), EMPLOYEE_ID)
    expect(result).toMatchObject({ ok: true, status: "rejected" })
  })

  it("won't edit or drop approved items", () => {
    const edited = formValues([{ index: 0, keep: true }, newLocalLine({ index: 1, receipt: OTHER_RECEIPT })])
    expect(buildEmployeeClaimItems(stored, "local", edited, EMPLOYEE_ID).ok).toBe(false)
    expect(buildEmployeeClaimItems(stored, "local", formValues([{ index: 0, keep: true }]), EMPLOYEE_ID).ok).toBe(false)
  })

  it("won't switch type once an item is approved, nor keep items entered for the old type", () => {
    const switched = formValues([{ index: 1, keep: true }, newLocalLine({ index: 0, usd: 1, exchangeRate: 1 })], "abroad")
    expect(buildEmployeeClaimItems(stored, "local", switched, EMPLOYEE_ID).ok).toBe(false)
    expect(buildEmployeeClaimItems([legacyLocalItem], "local", formValues([{ index: 0, keep: true }], "abroad"), EMPLOYEE_ID).ok).toBe(false)
  })

  it("rejects stale or duplicated indexes", () => {
    expect(buildEmployeeClaimItems(stored, "local", formValues([{ index: 5, keep: true }]), EMPLOYEE_ID).ok).toBe(false)
    expect(
      buildEmployeeClaimItems(stored, "local", formValues([{ index: 1, keep: true }, { index: 1, keep: true }]), EMPLOYEE_ID).ok
    ).toBe(false)
  })
})

describe("receipts", () => {
  it("only accepts paths under the employee's own folder with a generated name", () => {
    expect(isEmployeeReceiptPath(RECEIPT, EMPLOYEE_ID)).toBe(true)
    expect(isEmployeeReceiptPath(RECEIPT, "13")).toBe(false)
    expect(isEmployeeReceiptPath("expense-receipts/12/../13/x.jpg", EMPLOYEE_ID)).toBe(false)
    expect(isEmployeeReceiptPath("expense-receipts/12/0f8fad5b-d9cb-469f-a165-70867728950e.svg", EMPLOYEE_ID)).toBe(false)
    expect(isEmployeeReceiptPath("invoices/taxi.png", EMPLOYEE_ID)).toBe(false)
  })

  it("detects images by their leading bytes", () => {
    expect(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("png")
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg")
    const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ")
    expect(detectImageType(webp)).toBe("webp")
    expect(detectImageType(new TextEncoder().encode("<svg xmlns="))).toBeNull()
    expect(detectImageType(new Uint8Array([]))).toBeNull()
  })
})
