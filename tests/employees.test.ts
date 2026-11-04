import { describe, expect, it } from "vitest"
import { employeeCreateSchema } from "@/lib/employees"

const employee = { name: "Maria Lopez", email: "maria@example.test", consultantId: "" }

describe("employeeCreateSchema", () => {
  it("validates the employee and the password together", () => {
    expect(employeeCreateSchema.safeParse({ employee, password: "long-enough" }).success).toBe(true)
  })

  it("requires a password of at least 8 characters", () => {
    const result = employeeCreateSchema.safeParse({ employee, password: "short" })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(["password"])
  })

  it("still validates the employee fields", () => {
    const result = employeeCreateSchema.safeParse({ employee: { ...employee, email: "nope" }, password: "long-enough" })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(["employee", "email"])
  })
})
