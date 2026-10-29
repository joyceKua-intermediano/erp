"use client"

import { useId, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, LockIcon, Loader2Icon, RefreshCwIcon } from "lucide-react"
import { cn } from "cn"
import { TimesheetStatusBadge } from "@/components/timesheets/timesheet-status-badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useMyTimesheet, useSaveMyTimesheet } from "@/hooks/use-employee-timesheets"
import {
  daysInMonth,
  formatHours,
  formatPeriod,
  sumHours,
  timesheetYearOptions,
  toMonthValue,
  type TimesheetDetail,
} from "@/lib/timesheets"

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const backLink = (
  <Link
    href="/employee/timesheets"
    className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit text-muted-foreground" })}
  >
    <ArrowLeftIcon />
    My timesheets
  </Link>
)

function parseMonthValue(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]) }
}

function toHours(value: string) {
  const trimmed = value.trim()
  if (trimmed === "") return 0
  const hours = Number(trimmed)
  return Number.isFinite(hours) && hours >= 0 && hours <= 24 && Number.isInteger(hours * 4) ? hours : null
}

export function MyTimesheetEditor({ timesheetId }: { timesheetId: string | null }) {
  if (!timesheetId) return <MyTimesheetForm timesheet={null} />
  return <ExistingTimesheet timesheetId={timesheetId} />
}

function ExistingTimesheet({ timesheetId }: { timesheetId: string }) {
  const { data: timesheet, isPending, isError, refetch } = useMyTimesheet(timesheetId)

  if (isPending) return <Skeleton className="h-96 rounded-xl" />
  if (isError || !timesheet) {
    return (
      <div className="flex flex-col gap-4">
        {backLink}
        <Card className="[--card-spacing:--spacing(10)]">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              {isError ? "This timesheet couldn't be loaded." : "This timesheet doesn't exist or isn't yours."}
            </p>
            {isError && (
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCwIcon />
                Try again
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return <MyTimesheetForm key={timesheet.id} timesheet={timesheet} />
}

function MyTimesheetForm({ timesheet }: { timesheet: TimesheetDetail | null }) {
  const router = useRouter()
  const periodId = useId()
  const saveTimesheet = useSaveMyTimesheet()
  const [period, setPeriod] = useState(() => {
    const now = new Date()
    return toMonthValue(now.getFullYear(), now.getMonth() + 1)
  })
  const [inputs, setInputs] = useState<string[]>(() =>
    Array.from({ length: 31 }, (_, index) => {
      const hours = timesheet?.days[index]
      return hours ? String(hours) : ""
    })
  )
  const [isSaved, setSaved] = useState(false)

  const selected = timesheet ? { year: timesheet.year, month: timesheet.month } : parseMonthValue(period)
  const isLocked = timesheet?.status === "approved"
  const dayCount = selected ? daysInMonth(selected.year, selected.month) : 0
  const hours = inputs.slice(0, dayCount).map(toHours)
  const hasInvalidDay = hours.some((value) => value === null)
  const total = sumHours(hours.map((value) => value ?? 0))
  const leadingBlanks = selected ? new Date(Date.UTC(selected.year, selected.month - 1, 1)).getUTCDay() : 0
  const years = timesheetYearOptions()

  function updateDay(index: number, value: string) {
    setSaved(false)
    setInputs((current) => current.map((existing, position) => (position === index ? value : existing)))
  }

  function handleSave() {
    if (!selected || hasInvalidDay || isLocked) return
    setSaved(false)
    saveTimesheet.mutate(
      {
        timesheetId: timesheet?.id ?? null,
        input: { year: selected.year, month: selected.month, days: hours.map((value) => value ?? 0) },
      },
      {
        onSuccess: () => {
          if (timesheet) setSaved(true)
          else router.push("/employee/timesheets")
        },
      }
    )
  }

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      {backLink}

      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          {timesheet ? (
            <div className="flex flex-col gap-1.5">
              <h2 className="font-heading text-xl font-semibold tracking-tight">
                {formatPeriod(timesheet.year, timesheet.month)} timesheet
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <TimesheetStatusBadge status={timesheet.status} />
                {timesheet.companyName && <span>Reviewed by {timesheet.companyName}</span>}
              </div>
            </div>
          ) : (
            <Field className="sm:max-w-56">
              <FieldLabel htmlFor={periodId}>Month</FieldLabel>
              <Input
                id={periodId}
                type="month"
                value={period}
                min={`${years[0]}-01`}
                max={`${years[years.length - 1]}-12`}
                onChange={(event) => setPeriod(event.target.value)}
              />
              <FieldDescription>One timesheet per month.</FieldDescription>
            </Field>
          )}
          <div className="flex flex-col sm:items-end">
            <span className="text-xs text-muted-foreground">Total hours</span>
            <span className="text-2xl font-semibold tabular-nums">{formatHours(total)} hrs</span>
          </div>
        </CardContent>
      </Card>

      {isLocked && (
        <p className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          <LockIcon className="size-4" />
          This timesheet has been approved, so it can no longer be changed.
        </p>
      )}
      {timesheet?.status === "rejected" && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          This timesheet was rejected. Correct your hours and save to send it for review again.
        </p>
      )}
      {timesheet?.comment && (
        <Card className="gap-0 py-0">
          <CardHeader className="gap-1 border-b py-4 [--card-spacing:--spacing(6)]">
            <CardTitle className="text-sm">Reviewer comment</CardTitle>
          </CardHeader>
          <p className="px-6 py-4 text-sm whitespace-pre-line text-muted-foreground">{timesheet.comment}</p>
        </Card>
      )}

      <Card className="gap-0 py-0">
        <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
          <CardTitle>Daily hours</CardTitle>
          <CardDescription>
            {selected
              ? `Hours worked each day in ${formatPeriod(selected.year, selected.month)}, in steps of 0.25. Leave days off empty.`
              : "Choose a month to enter your hours."}
          </CardDescription>
        </CardHeader>
        {selected && (
          <div className="grid grid-cols-7 gap-2 px-6 py-5">
            {weekdays.map((weekday) => (
              <span key={weekday} className="text-center text-xs font-semibold tracking-wide text-primary uppercase">
                {weekday}
              </span>
            ))}
            {Array.from({ length: leadingBlanks }, (_, index) => (
              <span key={`blank-${index}`} aria-hidden />
            ))}
            {hours.map((value, index) => {
              const weekday = (leadingBlanks + index) % 7
              return (
                <label
                  key={index}
                  className={cn(
                    "flex flex-col gap-1 rounded-lg border px-2 py-1.5",
                    (weekday === 0 || weekday === 6) && "bg-muted/50"
                  )}
                >
                  <span className="text-xs text-muted-foreground">{index + 1}</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={24}
                    step={0.25}
                    value={inputs[index]}
                    disabled={isLocked}
                    aria-invalid={value === null}
                    aria-label={`Hours on day ${index + 1}`}
                    onChange={(event) => updateDay(index, event.target.value)}
                    className="h-7 px-1.5 text-sm tabular-nums"
                  />
                </label>
              )
            })}
          </div>
        )}
      </Card>

      {!isLocked && (
        <div className="flex flex-col items-end gap-2">
          {hasInvalidDay && (
            <p role="alert" className="text-sm text-destructive">
              Enter hours between 0 and 24, in steps of 0.25.
            </p>
          )}
          {saveTimesheet.isError && (
            <p role="alert" className="text-sm text-destructive">
              {saveTimesheet.error.message}
            </p>
          )}
          {isSaved && !saveTimesheet.isPending && (
            <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
              Saved and sent for review.
            </p>
          )}
          <Button onClick={handleSave} disabled={!selected || hasInvalidDay || saveTimesheet.isPending}>
            {saveTimesheet.isPending && <Loader2Icon className="animate-spin" />}
            {timesheet ? "Save and resubmit" : "Submit timesheet"}
          </Button>
        </div>
      )}
    </div>
  )
}
