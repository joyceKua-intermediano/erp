"use client"

import { useState, type FormEvent } from "react"
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useHolidayCountryOptions, useSaveHolidaySet } from "@/hooks/use-holidays"
import {
  emptyHolidayEntry,
  holidaySetFormSchema,
  monthLabels,
  toHolidaySetFormInput,
  type HolidayEntryFormInput,
  type HolidaySet,
  type HolidaySetFormInput,
} from "@/lib/holidays"

type HolidayFormSheetProps = {
  open: boolean
  holidaySet: HolidaySet | null
  formKey: number
  onOpenChange: (open: boolean) => void
}

const monthItems = monthLabels.map((label, index) => ({ label, value: String(index + 1) }))

export function HolidayFormSheet({ open, holidaySet, formKey, onOpenChange }: HolidayFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>{holidaySet ? "Edit holidays" : "Add holidays"}</SheetTitle>
          <SheetDescription>
            {holidaySet
              ? `Update the ${holidaySet.year} holidays for ${holidaySet.countryName}.`
              : "Set the public holidays for one country and year. Every cluster in that country shares them."}
          </SheetDescription>
        </SheetHeader>
        <HolidayForm key={formKey} holidaySet={holidaySet} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}

// Keyed by issue path, e.g. "year" or "holidays.2.day".
type FormErrors = Record<string, string>

type EntryRow = HolidayEntryFormInput & { rowId: number }

function HolidayForm({ holidaySet, onDone }: { holidaySet: HolidaySet | null; onDone: () => void }) {
  const [initial] = useState(() => toHolidaySetFormInput(holidaySet))
  const [countryId, setCountryId] = useState(initial.countryId)
  const [year, setYear] = useState(initial.year)
  const [rows, setRows] = useState<EntryRow[]>(() => initial.holidays.map((entry, index) => ({ ...entry, rowId: index })))
  const [nextRowId, setNextRowId] = useState(initial.holidays.length)
  const [errors, setErrors] = useState<FormErrors>({})
  const countryOptions = useHolidayCountryOptions()
  const saveHolidaySet = useSaveHolidaySet()
  const countries = countryOptions.data ?? []
  const isEditing = holidaySet !== null

  function clearError(path: string) {
    setErrors((current) => {
      if (!(path in current)) return current
      const next = { ...current }
      delete next[path]
      return next
    })
  }

  function updateRow(index: number, key: keyof HolidayEntryFormInput, value: string) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)))
    clearError(`holidays.${index}.${key}`)
  }

  function addRow() {
    setRows((current) => [...current, { ...emptyHolidayEntry(), rowId: nextRowId }])
    setNextRowId((current) => current + 1)
    clearError("holidays")
  }

  // Row errors are positional, so they're cleared rather than shifted when a row is removed.
  function removeRow(index: number) {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))
    setErrors((current) =>
      Object.fromEntries(Object.entries(current).filter(([path]) => !path.startsWith("holidays.")))
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input: HolidaySetFormInput = {
      countryId,
      year,
      holidays: rows.map(({ month, day, title }) => ({ month, day, title })),
    }
    const parsed = holidaySetFormSchema.safeParse(input)
    if (!parsed.success) {
      const next: FormErrors = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".")
        if (!(path in next)) next[path] = issue.message
      }
      setErrors(next)
      return
    }
    saveHolidaySet.mutate({ holidaySetId: holidaySet?.id ?? null, input }, { onSuccess: onDone })
  }

  function errorFor(path: string) {
    return errors[path] ? [{ message: errors[path] }] : undefined
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto" noValidate>
      <div className="flex flex-col gap-8 px-6 py-6">
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-xs font-semibold tracking-wide text-primary uppercase">Calendar</h3>
            <p className="text-xs text-muted-foreground">
              {isEditing
                ? "Country and year identify this list and can't be changed."
                : "Each country can have one holiday list per year."}
            </p>
          </div>
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <Field data-invalid={Boolean(errors.countryId)}>
                <FieldLabel htmlFor="holiday-countryId">Country</FieldLabel>
                <Select
                  value={countryId || null}
                  onValueChange={(value) => {
                    setCountryId((value as string | null) ?? "")
                    clearError("countryId")
                  }}
                  items={countries.map((country) => ({ label: country.name, value: country.id }))}
                  disabled={isEditing || countryOptions.isPending || countryOptions.isError}
                >
                  <SelectTrigger id="holiday-countryId" className="w-full" aria-invalid={Boolean(errors.countryId)}>
                    <SelectValue placeholder={countryOptions.isPending ? "Loading countries…" : "Choose a country"} />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.id} value={country.id}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {countryOptions.isError && (
                  <FieldDescription>Countries couldn&apos;t be loaded. Close and try again.</FieldDescription>
                )}
                <FieldError errors={errorFor("countryId")} />
              </Field>
              <Field data-invalid={Boolean(errors.year)}>
                <FieldLabel htmlFor="holiday-year">Year</FieldLabel>
                <Input
                  id="holiday-year"
                  inputMode="numeric"
                  value={year}
                  onChange={(event) => {
                    setYear(event.target.value)
                    clearError("year")
                  }}
                  placeholder={String(new Date().getFullYear())}
                  disabled={isEditing}
                  autoComplete="off"
                  aria-invalid={Boolean(errors.year)}
                />
                <FieldError errors={errorFor("year")} />
              </Field>
            </div>
          </FieldGroup>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <h3 className="text-xs font-semibold tracking-wide text-primary uppercase">Holidays</h3>
              <p className="text-xs text-muted-foreground">They&apos;re sorted by date when you save.</p>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {rows.length} {rows.length === 1 ? "holiday" : "holidays"}
            </span>
          </div>

          <ul className="flex flex-col gap-3">
            {rows.map((row, index) => {
              const monthPath = `holidays.${index}.month`
              const dayPath = `holidays.${index}.day`
              const titlePath = `holidays.${index}.title`
              return (
                <li key={row.rowId} className="rounded-xl border bg-muted/30 p-4">
                  <div className="grid gap-3 sm:grid-cols-[9rem_5rem_1fr_auto] sm:items-start">
                    <Field data-invalid={Boolean(errors[monthPath])}>
                      <FieldLabel htmlFor={`holiday-${row.rowId}-month`} className="sm:sr-only">
                        Month
                      </FieldLabel>
                      <Select
                        value={row.month || null}
                        onValueChange={(value) => updateRow(index, "month", (value as string | null) ?? "")}
                        items={monthItems}
                      >
                        <SelectTrigger
                          id={`holiday-${row.rowId}-month`}
                          className="w-full"
                          aria-invalid={Boolean(errors[monthPath])}
                        >
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {monthItems.map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError errors={errorFor(monthPath)} />
                    </Field>
                    <Field data-invalid={Boolean(errors[dayPath])}>
                      <FieldLabel htmlFor={`holiday-${row.rowId}-day`} className="sm:sr-only">
                        Day
                      </FieldLabel>
                      <Input
                        id={`holiday-${row.rowId}-day`}
                        inputMode="numeric"
                        value={row.day}
                        onChange={(event) => updateRow(index, "day", event.target.value)}
                        placeholder="Day"
                        autoComplete="off"
                        aria-invalid={Boolean(errors[dayPath])}
                      />
                    </Field>
                    <Field data-invalid={Boolean(errors[titlePath])}>
                      <FieldLabel htmlFor={`holiday-${row.rowId}-title`} className="sm:sr-only">
                        Holiday name
                      </FieldLabel>
                      <Input
                        id={`holiday-${row.rowId}-title`}
                        value={row.title}
                        onChange={(event) => updateRow(index, "title", event.target.value)}
                        placeholder="New Year's Day"
                        autoComplete="off"
                        aria-invalid={Boolean(errors[titlePath])}
                      />
                      <FieldError errors={errorFor(titlePath)} />
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="justify-self-end sm:mt-1"
                      onClick={() => removeRow(index)}
                      disabled={rows.length === 1}
                      aria-label={`Remove holiday ${index + 1}`}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                  {errors[dayPath] && (
                    <p role="alert" className="mt-2 text-sm text-destructive">
                      {errors[dayPath]}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
          {errors.holidays && (
            <p role="alert" className="text-sm text-destructive">
              {errors.holidays}
            </p>
          )}
          <Button type="button" variant="outline" onClick={addRow} className="self-start">
            <PlusIcon />
            Add holiday
          </Button>
        </section>
      </div>

      <SheetFooter className="border-t px-6 py-4">
        {saveHolidaySet.isError && (
          <p role="alert" className="text-sm text-destructive">
            {saveHolidaySet.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone} disabled={saveHolidaySet.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={saveHolidaySet.isPending}>
            {saveHolidaySet.isPending && <Loader2Icon className="animate-spin" />}
            {holidaySet ? "Save changes" : "Add holidays"}
          </Button>
        </div>
      </SheetFooter>
    </form>
  )
}
