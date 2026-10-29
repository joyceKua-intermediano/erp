import { describe, expect, it } from "vitest"
import {
  accruedVacationDays,
  annualVacationDays,
  calendarDaysBetween,
  countWorkingDays,
  parseNumberOfDays,
  toVacationBalance,
  vacationFormSchema,
} from "@/lib/vacations"

describe("annualVacationDays", () => {
  it("uses legacy's allowance per country and accepts both spellings of Brazil", () => {
    expect(annualVacationDays("Colombia")).toBe(15)
    expect(annualVacationDays("Brazil")).toBe(30)
    expect(annualVacationDays("Brasil")).toBe(30)
    expect(annualVacationDays("Costa Rica")).toBe(10)
    expect(annualVacationDays("Canada")).toBe(10)
    expect(annualVacationDays(null)).toBe(10)
  })
})

describe("accruedVacationDays", () => {
  it("pro-rates the allowance by whole days since the contract start", () => {
    const start = new Date("2025-01-01T00:00:00Z")
    expect(accruedVacationDays(15, start, new Date("2026-01-01T00:00:00Z"))).toBe(15)
    expect(accruedVacationDays(10, start, new Date("2025-02-12T12:00:00Z"))).toBeCloseTo((10 * 42) / 365)
  })

  it("uses 366 days when the contract started in a leap year", () => {
    expect(accruedVacationDays(30, new Date("2024-01-01T00:00:00Z"), new Date("2025-01-01T00:00:00Z"))).toBe(30)
  })

  it("accrues nothing without a start date or before it", () => {
    expect(accruedVacationDays(15, null, new Date())).toBe(0)
    expect(accruedVacationDays(15, new Date("2030-01-01T00:00:00Z"), new Date("2026-01-01T00:00:00Z"))).toBe(0)
  })
})

describe("toVacationBalance", () => {
  it("subtracts taken and pending days and never goes below zero", () => {
    expect(toVacationBalance(15, 12.3456, 5, 2)).toEqual({
      annualDays: 15,
      accrued: 12.35,
      taken: 5,
      pending: 2,
      available: 5.35,
    })
    expect(toVacationBalance(10, 3, 5, 0).available).toBe(0)
  })
})

describe("countWorkingDays", () => {
  it("skips weekends and holidays, counting both ends", () => {
    // Mon 2026-12-21 to Sun 2026-12-27 with Christmas on the Friday.
    expect(countWorkingDays("2026-12-21", "2026-12-27", new Set(["2026-12-25"]))).toBe(4)
    expect(countWorkingDays("2026-12-21", "2026-12-21", new Set())).toBe(1)
  })

  it("returns zero for a reversed range", () => {
    expect(countWorkingDays("2026-12-22", "2026-12-21", new Set())).toBe(0)
  })
})

describe("calendarDaysBetween", () => {
  it("counts both ends", () => {
    expect(calendarDaysBetween("2026-02-27", "2026-03-02")).toBe(4)
  })
})

describe("parseNumberOfDays", () => {
  it("reads legacy varchar values", () => {
    expect(parseNumberOfDays("5")).toBe(5)
    expect(parseNumberOfDays(" 2.5 ")).toBe(2.5)
    expect(parseNumberOfDays("1,5")).toBe(1.5)
    expect(parseNumberOfDays(null)).toBe(0)
    expect(parseNumberOfDays("abc")).toBe(0)
  })
})

describe("vacationFormSchema", () => {
  it("accepts a valid request", () => {
    expect(vacationFormSchema.safeParse({ startDate: "2026-12-21", endDate: "2026-12-24", numberOfDays: 3.5 }).success).toBe(
      true
    )
  })

  it("rejects reversed dates, impossible dates and too many days", () => {
    const issue = (input: Parameters<typeof vacationFormSchema.safeParse>[0]) =>
      vacationFormSchema.safeParse(input).error?.issues[0]?.message
    expect(issue({ startDate: "2026-12-22", endDate: "2026-12-21", numberOfDays: 1 })).toMatch(/before the start/)
    expect(issue({ startDate: "2026-02-30", endDate: "2026-03-02", numberOfDays: 1 })).toMatch(/valid date/)
    expect(issue({ startDate: "2026-12-21", endDate: "2026-12-22", numberOfDays: 3 })).toMatch(/cover 2 days/)
    expect(issue({ startDate: "2026-12-21", endDate: "2026-12-22", numberOfDays: 1.25 })).toMatch(/steps of 0.5/)
  })
})
