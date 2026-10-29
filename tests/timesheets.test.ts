import { describe, expect, it } from "vitest"
import {
  daysInMonth,
  parseTimesheetDays,
  sumHours,
  timesheetFormSchema,
  timesheetListQuerySchema,
  timesheetUpdateSchema,
  toStoredDays,
  toTimesheetCsv,
} from "@/lib/timesheets"

describe("parseTimesheetDays", () => {
  it("reads legacy's object keyed by day number", () => {
    expect(parseTimesheetDays('{"1": 8, "2": "7.5", "30": 4}', 2026, 4)).toEqual([
      8, 7.5, ...Array.from({ length: 27 }, () => 0), 4,
    ])
  })

  it("reads arrays and double-encoded JSON", () => {
    expect(parseTimesheetDays("[8, 6]", 2026, 2).slice(0, 3)).toEqual([8, 6, 0])
    expect(parseTimesheetDays(JSON.stringify('{"1": 5}'), 2026, 2)[0]).toBe(5)
  })

  it("returns a zero for every day when the value is unreadable", () => {
    expect(parseTimesheetDays("not json", 2024, 2)).toEqual(Array.from({ length: 29 }, () => 0))
    expect(parseTimesheetDays(null, 2026, 1)).toHaveLength(31)
  })

  it("ignores negative and non-numeric hours", () => {
    expect(parseTimesheetDays('{"1": -3, "2": "abc", "3": 2}', 2026, 1).slice(0, 3)).toEqual([0, 0, 2])
  })

  it("round-trips what toStoredDays writes", () => {
    const days = Array.from({ length: daysInMonth(2026, 2) }, (_, index) => (index % 7 < 5 ? 8 : 0))
    expect(parseTimesheetDays(toStoredDays(days), 2026, 2)).toEqual(days)
  })
})

describe("daysInMonth", () => {
  it("handles leap years", () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2026, 12)).toBe(31)
  })
})

describe("sumHours", () => {
  it("rounds to two decimals", () => {
    expect(sumHours([0.25, 0.25, 0.1, 0.2])).toBe(0.8)
  })
})

describe("timesheet schemas", () => {
  const year = new Date().getFullYear()
  const fullMonth = (hours: number) => Array.from({ length: daysInMonth(year, 3) }, () => hours)

  it("accepts a full month in quarter-hour steps", () => {
    expect(timesheetFormSchema.safeParse({ year, month: 3, days: fullMonth(7.75) }).success).toBe(true)
  })

  it("rejects missing days, bad steps and impossible hours", () => {
    expect(timesheetFormSchema.safeParse({ year, month: 3, days: [8] }).success).toBe(false)
    expect(timesheetFormSchema.safeParse({ year, month: 3, days: fullMonth(7.3) }).success).toBe(false)
    expect(timesheetFormSchema.safeParse({ year, month: 3, days: fullMonth(25) }).success).toBe(false)
  })

  it("limits new timesheets to last, this or next year but lets edits keep older periods", () => {
    const old = { year: year - 5, month: 3, days: Array.from({ length: daysInMonth(year - 5, 3) }, () => 8) }
    expect(timesheetFormSchema.safeParse(old).success).toBe(false)
    expect(timesheetUpdateSchema.safeParse(old).success).toBe(true)
  })

  it("falls back to safe list query defaults", () => {
    expect(timesheetListQuerySchema.parse({})).toEqual({ page: 1, search: "", month: "", status: null })
    expect(timesheetListQuerySchema.parse({ page: -4, month: "2026-13", status: "nope" })).toEqual({
      page: 1,
      search: "",
      month: "",
      status: null,
    })
  })
})

describe("toTimesheetCsv", () => {
  const timesheet = { employeeName: "Ana", year: 2026, month: 2, days: [8, 7.5], totalHours: 15.5 }

  it("writes the legacy columns: Employee, Month, Year, Day 1..31, Total Hours", () => {
    const [header, row] = toTimesheetCsv(timesheet).trim().split("\r\n")
    expect(header.split(",")).toHaveLength(35)
    expect(row.split(",").slice(0, 5)).toEqual(["Ana", "February", "2026", "8", "7.5"])
    expect(row.split(",").at(-1)).toBe("15.5")
  })

  it("stops spreadsheet apps from running names as formulas and quotes commas", () => {
    const [, row] = toTimesheetCsv({ ...timesheet, employeeName: "=SUM(A1), Bob" }).trim().split("\r\n")
    expect(row.startsWith(`"'=SUM(A1), Bob"`)).toBe(true)
  })
})
