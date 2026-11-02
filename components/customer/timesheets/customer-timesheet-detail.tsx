"use client"

import { useId, useState } from "react"
import Link from "next/link"
import { ArrowLeftIcon, CheckIcon, Loader2Icon, RefreshCwIcon, XIcon } from "lucide-react"
import { DailyHoursCard } from "@/components/timesheets/timesheet-detail"
import { TimesheetStatusBadge } from "@/components/timesheets/timesheet-status-badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useCustomerTimesheet, useReviewCustomerTimesheet } from "@/hooks/use-customer-timesheets"
import { formatHours, formatPeriod, type TimesheetDetail } from "@/lib/timesheets"

const backLink = (
  <Link
    href="/customer/timesheets"
    className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit text-muted-foreground" })}
  >
    <ArrowLeftIcon />
    All timesheets
  </Link>
)

function MessageCard({ title, message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {backLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          {title && <h2 className="font-heading text-lg font-semibold">{title}</h2>}
          <p className="max-w-md text-sm text-muted-foreground">{message}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCwIcon />
              Try again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function CustomerTimesheetDetail({ timesheetId }: { timesheetId: string }) {
  const { data: timesheet, isPending, isError, refetch } = useCustomerTimesheet(timesheetId)

  if (isPending) return <Skeleton className="h-96 rounded-xl" />
  if (isError) return <MessageCard message="This timesheet couldn't be loaded." onRetry={() => refetch()} />
  if (!timesheet) {
    return <MessageCard title="Timesheet not found" message="It may have been removed, or the link is wrong." />
  }

  const period = formatPeriod(timesheet.year, timesheet.month)

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      {backLink}

      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-heading text-xl font-semibold tracking-tight">{period} timesheet</h2>
            <p className="text-sm font-medium">{timesheet.employeeName}</p>
            <div>
              <TimesheetStatusBadge status={timesheet.status} />
            </div>
          </div>
          <div className="flex flex-col sm:items-end">
            <span className="text-xs text-muted-foreground">Total hours</span>
            <span className="text-2xl font-semibold tabular-nums">{formatHours(timesheet.totalHours)} hrs</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <DailyHoursCard timesheet={timesheet} />
        <ReviewCard key={timesheet.id} timesheet={timesheet} />
      </div>
    </div>
  )
}

function ReviewCard({ timesheet }: { timesheet: TimesheetDetail }) {
  const commentId = useId()
  const reviewTimesheet = useReviewCustomerTimesheet()
  const [status, setStatus] = useState<"approved" | "rejected" | null>(
    timesheet.status === "pending" ? null : timesheet.status
  )
  const [comment, setComment] = useState(timesheet.comment ?? "")
  const [isSaved, setSaved] = useState(false)

  function handleSave() {
    if (!status) return
    setSaved(false)
    reviewTimesheet.mutate(
      { timesheetId: timesheet.id, input: { status, comment } },
      { onSuccess: () => setSaved(true) }
    )
  }

  return (
    <Card className="h-fit gap-0 py-0">
      <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
        <CardTitle>Your review</CardTitle>
        <CardDescription>The employee sees the status and your comment in their portal.</CardDescription>
      </CardHeader>
      <div className="flex flex-col gap-4 px-6 py-5">
        <ToggleGroup
          variant="outline"
          spacing={0}
          value={status ? [status] : []}
          onValueChange={(values) => {
            const next = values[0] as "approved" | "rejected" | undefined
            if (next) setStatus(next)
            setSaved(false)
          }}
          aria-label="Review decision"
          className="w-full"
        >
          <ToggleGroupItem
            value="approved"
            className="flex-1 data-pressed:bg-emerald-500/10 data-pressed:text-emerald-700 dark:data-pressed:text-emerald-400"
          >
            <CheckIcon />
            Approve
          </ToggleGroupItem>
          <ToggleGroupItem value="rejected" className="flex-1 data-pressed:bg-destructive/10 data-pressed:text-destructive">
            <XIcon />
            Reject
          </ToggleGroupItem>
        </ToggleGroup>
        <Field>
          <FieldLabel htmlFor={commentId}>Comment</FieldLabel>
          <Textarea
            id={commentId}
            value={comment}
            maxLength={255}
            onChange={(event) => {
              setComment(event.target.value)
              setSaved(false)
            }}
            placeholder="Optional note for the employee"
          />
          <FieldDescription>{comment.length}/255 characters</FieldDescription>
        </Field>
        {reviewTimesheet.isError && (
          <p role="alert" className="text-sm text-destructive">
            {reviewTimesheet.error.message}
          </p>
        )}
        {isSaved && !reviewTimesheet.isPending && (
          <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
            Review saved.
          </p>
        )}
        <Button onClick={handleSave} disabled={!status || reviewTimesheet.isPending}>
          {reviewTimesheet.isPending && <Loader2Icon className="animate-spin" />}
          Save review
        </Button>
      </div>
    </Card>
  )
}
