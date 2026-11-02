import { describe, expect, it } from "vitest"
import {
  canUseCustomerPortal,
  customerContractListQuerySchema,
  customerContractListWhere,
  customerContractPdfUrl,
  customerContractsWhere,
  customerExpensesWhere,
  customerTimesheetsWhere,
  customerVacationsWhere,
} from "@/lib/customer-portal"
import { approvePendingItems } from "@/lib/expenses"

const COMPANY_ID = BigInt(7)

describe("canUseCustomerPortal", () => {
  it("accepts a company account", () => {
    expect(canUseCustomerPortal({ company_id: COMPANY_ID, companies: { deleted_at: null } })).toBe(true)
  })

  it("refuses partner accounts, which have no company", () => {
    expect(canUseCustomerPortal({ company_id: null, companies: null })).toBe(false)
  })

  it("refuses accounts whose company is archived", () => {
    expect(canUseCustomerPortal({ company_id: COMPANY_ID, companies: { deleted_at: new Date() } })).toBe(false)
  })
})

describe("customer scope", () => {
  it("limits approvals to records billed to the customer's company", () => {
    expect(customerTimesheetsWhere(COMPANY_ID)).toEqual({ company_id: COMPANY_ID })
    expect(customerVacationsWhere(COMPANY_ID)).toEqual({ company_id: COMPANY_ID })
    expect(customerExpensesWhere(COMPANY_ID)).toEqual({ company_id: COMPANY_ID })
  })

  it("limits contracts to the company's live customer and employee contracts", () => {
    expect(customerContractsWhere(COMPANY_ID)).toEqual({
      company_id: COMPANY_ID,
      deleted_at: null,
      contract_type: { in: ["customer", "employee"] },
    })
  })

  it("keeps the company scope when a list query is applied", () => {
    const query = customerContractListQuerySchema.parse({ search: "Ana", kind: "employee" })
    const where = customerContractListWhere(COMPANY_ID, query)
    expect(where.AND).toEqual([
      customerContractsWhere(COMPANY_ID),
      { OR: [{ employees: { name: { contains: "Ana" } } }, { job_title: { contains: "Ana" } }] },
      { contract_type: "employee" },
    ])
  })

  it("ignores contract kinds a customer can't see", () => {
    expect(customerContractListQuerySchema.parse({ kind: "partner" }).kind).toBeNull()
  })
})

describe("customerContractPdfUrl", () => {
  it("builds view and download links", () => {
    expect(customerContractPdfUrl("12")).toBe("/api/customer/contracts/12/pdf")
    expect(customerContractPdfUrl("12", true)).toBe("/api/customer/contracts/12/pdf?download=1")
  })
})

describe("approvePendingItems", () => {
  it("approves waiting items and keeps reviewed ones", () => {
    const result = approvePendingItems([
      { description: "Taxi", status: "pending" },
      { description: "Hotel", status: "rejected", comments: "No receipt" },
      { description: "Lunch" },
    ])
    expect(result.approved).toBe(2)
    expect(result.items).toEqual([
      { description: "Taxi", status: "approved" },
      { description: "Hotel", status: "rejected", comments: "No receipt" },
      { description: "Lunch", status: "approved" },
    ])
    expect(result.status).toBe("rejected")
  })

  it("approves the claim when every item ends up approved", () => {
    const result = approvePendingItems([{ status: "pending" }, { status: "approved" }])
    expect(result.status).toBe("approved")
  })

  it("approves nothing when no item is waiting", () => {
    expect(approvePendingItems([{ status: "approved" }]).approved).toBe(0)
  })
})
