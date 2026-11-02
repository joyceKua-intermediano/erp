import bcrypt from "bcryptjs"
import { describe, expect, it } from "vitest"
import {
  customerAccountCreateSchema,
  customerAccountFormSchema,
  customerAccountListQuerySchema,
  generatePassword,
  passwordResetSchema,
  toAccountLink,
  toLaravelBcrypt,
} from "@/lib/customer-accounts"

const companyAccount = { type: "company", companyId: "1", partnerId: "", name: "Ana Souza", email: "ana@acme.test" } as const

describe("customerAccountFormSchema", () => {
  it("accepts a company account and normalises the email", () => {
    const parsed = customerAccountFormSchema.parse({ ...companyAccount, email: "  Ana@ACME.test " })
    expect(parsed.email).toBe("ana@acme.test")
  })

  it("requires the company for a company account", () => {
    const result = customerAccountFormSchema.safeParse({ ...companyAccount, companyId: "" })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(["companyId"])
  })

  it("requires the partner for a partner account", () => {
    const result = customerAccountFormSchema.safeParse({ ...companyAccount, type: "partner" })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(["partnerId"])
  })

  it("rejects an invalid email", () => {
    expect(customerAccountFormSchema.safeParse({ ...companyAccount, email: "not-an-email" }).success).toBe(false)
  })
})

describe("password schemas", () => {
  it("needs at least 8 characters", () => {
    expect(passwordResetSchema.safeParse({ password: "short" }).success).toBe(false)
    expect(passwordResetSchema.safeParse({ password: "long-enough" }).success).toBe(true)
  })

  it("validates the account and the password together on create", () => {
    expect(customerAccountCreateSchema.safeParse({ account: companyAccount, password: "long-enough" }).success).toBe(true)
    expect(customerAccountCreateSchema.safeParse({ account: companyAccount, password: "" }).success).toBe(false)
  })
})

describe("customerAccountListQuerySchema", () => {
  it("defaults to active accounts", () => {
    expect(customerAccountListQuerySchema.parse({}).status).toBe("active")
    expect(customerAccountListQuerySchema.parse({ status: "deleted" }).status).toBe("active")
  })
})

describe("toAccountLink", () => {
  it("keeps only the link for the chosen type", () => {
    expect(toAccountLink({ type: "company", companyId: "3", partnerId: "9" })).toEqual({
      company_id: BigInt(3),
      partner_id: null,
    })
    expect(toAccountLink({ type: "partner", companyId: "3", partnerId: "9" })).toEqual({
      company_id: null,
      partner_id: BigInt(9),
    })
  })
})

describe("toLaravelBcrypt", () => {
  it("rewrites bcryptjs hashes to the $2y$ prefix Laravel checks", async () => {
    const hash = toLaravelBcrypt(await bcrypt.hash("secret-password", 4))
    expect(hash.startsWith("$2y$04$")).toBe(true)
    expect(await bcrypt.compare("secret-password", hash)).toBe(true)
  })

  it("leaves $2y$ hashes alone", () => {
    const hash = "$2y$12$abcdefghijklmnopqrstuuOcbXz1kM0k3l8Gd9y8nU2Gx6pQh1l2m"
    expect(toLaravelBcrypt(hash)).toBe(hash)
  })
})

describe("generatePassword", () => {
  it("makes a 14-character password in three groups without look-alike characters", () => {
    const password = generatePassword()
    expect(password).toMatch(/^[a-zA-Z2-9]{4}-[a-zA-Z2-9]{4}-[a-zA-Z2-9]{4}$/)
    expect(password).not.toMatch(/[01OlI]/)
    expect(passwordResetSchema.safeParse({ password }).success).toBe(true)
  })
})
