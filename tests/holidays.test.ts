import { describe, expect, it } from "vitest"
import { holidaySetFormSchema, nextHoliday, parseStoredHolidays, serializeHolidays } from "@/lib/holidays"

describe("parseStoredHolidays", () => {
  it("reads legacy lists with string values and sorts them", () => {
    const raw = JSON.stringify([
      { month: "12", day: "25", title: "Christmas" },
      { month: "1", day: "1", title: "New Year" },
    ])
    expect(parseStoredHolidays(raw)).toEqual([
      { month: 1, day: 1, title: "New Year" },
      { month: 12, day: 25, title: "Christmas" },
    ])
  })

  it("reads repeater objects keyed by UUID and drops malformed items", () => {
    const raw = JSON.stringify({
      "a-uuid": { month: 5, day: 1, title: "Labour Day" },
      "b-uuid": { month: 13, day: 1, title: "Bad month" },
      "c-uuid": "nope",
    })
    expect(parseStoredHolidays(raw)).toEqual([{ month: 5, day: 1, title: "Labour Day" }])
  })

  it("returns an empty list for invalid JSON", () => {
    expect(parseStoredHolidays("not json")).toEqual([])
  })

  it("round-trips through serializeHolidays", () => {
    const entries = [{ month: 7, day: 4, title: "Independence Day" }]
    expect(parseStoredHolidays(serializeHolidays(entries))).toEqual(entries)
  })
})

describe("holidaySetFormSchema", () => {
  const base = { countryId: "1", year: "2027", holidays: [{ month: "1", day: "1", title: "New Year" }] }

  it("accepts a valid list", () => {
    expect(holidaySetFormSchema.safeParse(base).success).toBe(true)
  })

  it("rejects impossible dates and duplicates", () => {
    const leap = holidaySetFormSchema.safeParse({ ...base, holidays: [{ month: "2", day: "29", title: "Leap" }] })
    expect(leap.success).toBe(false)

    const duplicate = holidaySetFormSchema.safeParse({
      ...base,
      holidays: [
        { month: "1", day: "1", title: "New Year" },
        { month: "1", day: "1", title: "Again" },
      ],
    })
    expect(duplicate.success).toBe(false)
  })

  it("accepts Feb 29 in a leap year", () => {
    const result = holidaySetFormSchema.safeParse({
      ...base,
      year: "2028",
      holidays: [{ month: "2", day: "29", title: "Leap" }],
    })
    expect(result.success).toBe(true)
  })
})

describe("nextHoliday", () => {
  const set = {
    year: 2026,
    holidays: [
      { month: 1, day: 1, title: "New Year" },
      { month: 12, day: 25, title: "Christmas" },
    ],
  }

  it("finds the next holiday in the current year", () => {
    expect(nextHoliday(set, new Date(2026, 9, 29))?.title).toBe("Christmas")
  })

  it("returns null for past years", () => {
    expect(nextHoliday(set, new Date(2027, 0, 1))).toBeNull()
  })
})
