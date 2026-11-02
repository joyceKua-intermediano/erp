import { describe, expect, it, vi } from "vitest"
import {
  formatPayslipPeriod,
  isPdf,
  legacyClusterKey,
  payslipListQuerySchema,
  payslipPathFor,
  payslipUploadSchema,
  sanitizePayslipFileName,
  toStoredPeriod,
} from "@/lib/payslips"

vi.mock("server-only", () => ({}))

const bytes = (text: string) => new TextEncoder().encode(text)

describe("isPdf", () => {
  it("accepts files starting with the PDF signature", () => {
    expect(isPdf(bytes("%PDF-1.7\n..."))).toBe(true)
  })

  it("rejects other files and short input", () => {
    expect(isPdf(bytes("PK\u0003\u0004 zip"))).toBe(false)
    expect(isPdf(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBe(false)
    expect(isPdf(bytes("%PDF"))).toBe(false)
  })
})

describe("payslip periods", () => {
  it("stores a picked month as the legacy Y-m-d shape", () => {
    expect(toStoredPeriod("2026-10")).toBe("2026-10-01")
  })

  it("formats legacy dates and new periods as month and year", () => {
    expect(formatPayslipPeriod("2025-08-25")).toBe("August 2025")
    expect(formatPayslipPeriod("2026-10-01")).toBe("October 2026")
    expect(formatPayslipPeriod("2026-01")).toBe("January 2026")
  })

  it("shows anything else as stored", () => {
    expect(formatPayslipPeriod(" Q3 bonus ")).toBe("Q3 bonus")
    expect(formatPayslipPeriod("2026-13-01")).toBe("2026-13-01")
    expect(formatPayslipPeriod("")).toBe("—")
  })

  it("only accepts a real month on upload", () => {
    expect(payslipUploadSchema.safeParse({ employeeId: "7", period: "2026-10" }).success).toBe(true)
    expect(payslipUploadSchema.safeParse({ employeeId: "7", period: "2026-13" }).success).toBe(false)
    expect(payslipUploadSchema.safeParse({ employeeId: "7", period: "2026-10-01" }).success).toBe(false)
    expect(payslipUploadSchema.safeParse({ employeeId: "abc", period: "2026-10" }).success).toBe(false)
  })

  it("drops an invalid period filter instead of failing the list", () => {
    expect(payslipListQuerySchema.parse({ period: "nope" }).period).toBeNull()
    expect(payslipListQuerySchema.parse({ period: "2026-10" }).period).toBe("2026-10")
  })
})

describe("legacyClusterKey", () => {
  it("matches legacy Filament cluster class names", () => {
    expect(legacyClusterKey("Intermediano do Brasil Ltda.")).toBe("IntermedianoDoBrasilLtda")
    expect(legacyClusterKey("Intermediano Global Services Ltda")).toBe("IntermedianoGlobalServicesLtda")
    expect(legacyClusterKey("Intermediano Canada")).toBe("IntermedianoCanada")
    expect(legacyClusterKey("  Intermediano,  Hongkong ")).toBe("IntermedianoHongkong")
  })
})

describe("sanitizePayslipFileName", () => {
  it("keeps a readable name ending in .pdf", () => {
    expect(sanitizePayslipFileName("Payslip October 2026.pdf")).toBe("Payslip October 2026.pdf")
    expect(sanitizePayslipFileName("payslip.PDF")).toBe("payslip.pdf")
    expect(sanitizePayslipFileName("payslip")).toBe("payslip.pdf")
  })

  it("strips paths, quotes and control characters", () => {
    expect(sanitizePayslipFileName("C:\\fakepath\\ana \"oct\".pdf")).toBe("ana oct.pdf")
    expect(sanitizePayslipFileName("../../etc/passwd")).toBe("passwd.pdf")
    expect(sanitizePayslipFileName("a\u0000b\nc.pdf")).toBe("abc.pdf")
  })

  it("falls back when nothing is left and caps the length", () => {
    expect(sanitizePayslipFileName("\"\".pdf")).toBe("payslip.pdf")
    expect(sanitizePayslipFileName(`${"x".repeat(300)}.pdf`)).toBe(`${"x".repeat(200)}.pdf`)
  })
})

describe("payslip storage", () => {
  it("keeps new files under the cluster with a generated name", () => {
    expect(payslipPathFor(BigInt(3), "0f8fad5b-d9cb-469f-a165-70867728950e")).toBe(
      "payslips/3/0f8fad5b-d9cb-469f-a165-70867728950e.pdf"
    )
  })
})

describe("clusterPayslipsWhere", () => {
  it("scopes payslips to the employee's current cluster", async () => {
    const { clusterPayslipsWhere, payslipListWhere } = await import("@/lib/payslips/records")
    expect(clusterPayslipsWhere(BigInt(5))).toEqual({ employees: { intermediano_company_id: BigInt(5) } })
    expect(payslipListWhere(BigInt(5), { page: 1, search: "", period: "2026-10" })).toEqual({
      AND: [{ employees: { intermediano_company_id: BigInt(5) } }, { payslip_period: { startsWith: "2026-10" } }],
    })
  })
})
