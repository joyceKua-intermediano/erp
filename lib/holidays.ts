import { z } from "zod"

export const monthLabels = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

export const HOLIDAY_YEAR_MIN = 2000
export const HOLIDAY_YEAR_MAX = 2100

export type HolidayEntry = {
  month: number
  day: number
  title: string
}

export type HolidaySet = {
  id: string
  countryId: string
  countryName: string
  year: number
  holidays: HolidayEntry[]
  createdAt: string | null
  updatedAt: string | null
}

export const holidaySetIdSchema = z.string().regex(/^\d+$/, "Invalid holiday list id.")

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function sortHolidays(entries: HolidayEntry[]) {
  return [...entries].sort((a, b) => a.month - b.month || a.day - b.day)
}

// The legacy Filament repeater may have saved a list or an object keyed by item UUIDs, with numbers or numeric strings.
export function parseStoredHolidays(raw: string): HolidayEntry[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!parsed || typeof parsed !== "object") return []

  const items = Array.isArray(parsed) ? parsed : Object.values(parsed)
  const entries = items.flatMap((item): HolidayEntry[] => {
    if (!item || typeof item !== "object") return []
    const record = item as Record<string, unknown>
    const month = Number(record.month)
    const day = Number(record.day)
    if (!Number.isInteger(month) || month < 1 || month > 12) return []
    if (!Number.isInteger(day) || day < 1 || day > 31) return []
    const title = typeof record.title === "string" ? record.title.trim() : ""
    return [{ month, day, title }]
  })
  return sortHolidays(entries)
}

// Saved in the same shape the legacy repeater writes so both apps keep reading the column.
export function serializeHolidays(entries: HolidayEntry[]) {
  return JSON.stringify(
    sortHolidays(entries).map((entry) => ({ month: String(entry.month), day: String(entry.day), title: entry.title }))
  )
}

export function formatHolidayDate(entry: Pick<HolidayEntry, "month" | "day">) {
  return `${monthLabels[entry.month - 1]?.slice(0, 3) ?? "?"} ${entry.day}`
}

export function nextHoliday(set: Pick<HolidaySet, "year" | "holidays">, today: Date) {
  const currentYear = today.getFullYear()
  if (set.year < currentYear) return null
  if (set.year > currentYear) return set.holidays[0] ?? null
  const month = today.getMonth() + 1
  const day = today.getDate()
  return set.holidays.find((entry) => entry.month > month || (entry.month === month && entry.day >= day)) ?? null
}

const holidayEntrySchema = z.object({
  month: z.string().regex(/^(?:[1-9]|1[0-2])$/, "Choose a month."),
  day: z.string().trim().regex(/^(?:[1-9]|[12]\d|3[01])$/, "Enter a day from 1 to 31."),
  title: z.string().trim().min(1, "Enter the holiday name.").max(255, "Holiday name is too long."),
})

export const holidaySetFormSchema = z
  .object({
    countryId: z.string().regex(/^\d+$/, "Choose a country."),
    year: z
      .string()
      .trim()
      .regex(/^\d{4}$/, "Enter a four-digit year.")
      .refine(
        (value) => Number(value) >= HOLIDAY_YEAR_MIN && Number(value) <= HOLIDAY_YEAR_MAX,
        `Enter a year from ${HOLIDAY_YEAR_MIN} to ${HOLIDAY_YEAR_MAX}.`
      ),
    holidays: z.array(holidayEntrySchema).min(1, "Add at least one holiday.").max(100, "Too many holidays."),
  })
  .superRefine((value, ctx) => {
    const year = Number(value.year)
    const seen = new Set<string>()
    value.holidays.forEach((entry, index) => {
      const month = Number(entry.month)
      const day = Number(entry.day)
      if (!Number.isInteger(month) || !Number.isInteger(day)) return
      if (Number.isInteger(year) && day > daysInMonth(year, month)) {
        ctx.addIssue({
          code: "custom",
          path: ["holidays", index, "day"],
          message: `${monthLabels[month - 1]} ${value.year} only has ${daysInMonth(year, month)} days.`,
        })
        return
      }
      const key = `${month}-${day}`
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["holidays", index, "day"],
          message: "Another holiday already uses this date.",
        })
      }
      seen.add(key)
    })
  })

export type HolidaySetFormInput = z.input<typeof holidaySetFormSchema>
export type HolidayEntryFormInput = HolidaySetFormInput["holidays"][number]

export function emptyHolidayEntry(): HolidayEntryFormInput {
  return { month: "", day: "", title: "" }
}

export function toHolidaySetFormInput(set: HolidaySet | null): HolidaySetFormInput {
  return {
    countryId: set?.countryId ?? "",
    year: String(set?.year ?? new Date().getFullYear()),
    holidays: set?.holidays.length
      ? set.holidays.map((entry) => ({ month: String(entry.month), day: String(entry.day), title: entry.title }))
      : [emptyHolidayEntry()],
  }
}

export function toHolidayEntries(input: z.output<typeof holidaySetFormSchema>["holidays"]): HolidayEntry[] {
  return sortHolidays(
    input.map((entry) => ({ month: Number(entry.month), day: Number(entry.day), title: entry.title }))
  )
}
