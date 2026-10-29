"use client"

import { useId, useState } from "react"
import Link from "next/link"
import { ArrowLeftIcon, CheckIcon, FileDownIcon, Loader2Icon, RefreshCwIcon, XIcon } from "lucide-react"
import { cn } from "cn"
import { ChooseClusterCard, ModuleDisabledCard } from "@/components/employees/employee-workspace"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useActiveCluster } from "@/hooks/use-clusters"
import { useReviewTimesheet, useTimesheet } from "@/hooks/use-timesheets"
import { formatHours, formatPeriod, type TimesheetDetail } from "@/lib/timesheets"
import { TimesheetStatusBadge } from "./timesheet-status-badge"
import { timesheetCsvUrl } from "./timesheet-workspace"

const timesheetBackLink = (
  <Link
    href="/admin/timesheets"
    className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit text-muted-foreground" })}
  >
    <ArrowLeftIcon />
    All timesheets
  </Link>
)

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function TimesheetNotFound({ clusterLabel }: { clusterLabel: string }) {
  return (
    <div className="flex flex-col gap-4">
      {timesheetBackLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-heading text-lg font-semibold">Timesheet not found in {clusterLabel}</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            It may belong to an employee of another cluster, or the link is wrong.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function TimesheetLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {timesheetBackLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">This timesheet couldn&apos;t be loaded.</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCwIcon />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

type TimesheetDetailViewProps = {
  timesheetId: string
  canManage: boolean
}

export function TimesheetDetailView({ timesheetId, canManage }: TimesheetDetailViewProps) {
  const activeCluster = useActiveCluster()

  if (!activeCluster) {
    return <ChooseClusterCard description="Timesheets are scoped to one Intermediano legal entity at a time." />
  }
  if (!activeCluster.modules.includes("timesheets")) {
    return <ModuleDisabledCard module="timesheets" clusterLabel={activeCluster.label} />
  }

  return (
    <ClusterTimesheetDetail
      key={activeCluster.id}
      timesheetId={timesheetId}
      clusterId={activeCluster.id}
      clusterLabel={activeCluster.label}
      canManage={canManage}
    />
  )
}

function ClusterTimesheetDetail({
  timesheetId,
  clusterId,
  clusterLabel,
  canManage,
}: TimesheetDetailViewProps & { clusterId: string; clusterLabel: string }) {
  const { data: timesheet, isPending, isError, refetch } = useTimesheet(timesheetId)

  if (isPending) return <Skeleton className="h-96 rounded-xl" />
  if (isError) return <TimesheetLoadError onRetry={() => refetch()} />
  if (!timesheet) return <TimesheetNotFound clusterLabel={clusterLabel} />

  return (
    <TimesheetDetailContent
      timesheet={timesheet}
      clusterId={clusterId}
      clusterLabel={clusterLabel}
      canManage={canManage}
    />
  )
}

function DailyHoursCard({ timesheet }: { timesheet: TimesheetDetail }) {
  const firstWeekday = new Date(Date.UTC(timesheet.year, timesheet.month - 1, 1)).getUTCDay()
  const leadingBlanks = Number.isNaN(firstWeekday) ? 0 : firstWeekday
  const daysWorked = timesheet.days.filter((hours) => hours > 0).length

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
        <CardTitle>Daily hours</CardTitle>
        <CardDescription>
          {daysWorked} {daysWorked === 1 ? "day" : "days"} with hours logged in {formatPeriod(timesheet.year, timesheet.month)}.
        </CardDescription>
      </CardHeader>
      <div className="grid grid-cols-7 gap-2 px-6 py-5">
        {weekdays.map((weekday) => (
          <span key={weekday} className="text-center text-xs font-semibold tracking-wide text-primary uppercase">
            {weekday}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span key={`blank-${index}`} aria-hidden />
        ))}
        {timesheet.days.map((hours, index) => {
          const weekday = (leadingBlanks + index) % 7
          const isWeekend = weekday === 0 || weekday === 6
          return (
            <div
              key={index}
              className={cn(
                "flex flex-col gap-1 rounded-lg border px-2 py-1.5",
                isWeekend && "bg-muted/50",
                hours > 0 && "border-primary/30 bg-primary/5"
              )}
            >
              <span className="text-xs text-muted-foreground">{index + 1}</span>
              <span className={cn("text-sm tabular-nums", hours > 0 ? "font-semibold" : "text-muted-foreground")}>
                {hours > 0 ? formatHours(hours) : "—"}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function ReviewCard({ timesheet }: { timesheet: TimesheetDetail }) {
  const commentId = useId()
  const reviewTimesheet = useReviewTimesheet()
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
        <CardTitle>Review</CardTitle>
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
          <ToggleGroupItem
            value="rejected"
            className="flex-1 data-pressed:bg-destructive/10 data-pressed:text-destructive"
          >
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

function TimesheetDetailContent({
  timesheet,
  clusterId,
  clusterLabel,
  canManage,
}: {
  timesheet: TimesheetDetail
  clusterId: string
  clusterLabel: string
  canManage: boolean
}) {
  const period = formatPeriod(timesheet.year, timesheet.month)

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      {timesheetBackLink}

      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-heading text-xl font-semibold tracking-tight">{period} timesheet</h2>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{timesheet.employeeName}</span>
              {timesheet.companyName && <> · for {timesheet.companyName}</>}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <TimesheetStatusBadge status={timesheet.status} />
              <Badge variant="outline" className="border-primary/30 text-primary">
                {clusterLabel}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex flex-col sm:items-end">
              <span className="text-xs text-muted-foreground">Total hours</span>
              <span className="text-2xl font-semibold tabular-nums">{formatHours(timesheet.totalHours)} hrs</span>
            </div>
            <a href={timesheetCsvUrl(timesheet.id, clusterId)} download className={buttonVariants({ variant: "outline" })}>
              <FileDownIcon />
              Export CSV
            </a>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <DailyHoursCard timesheet={timesheet} />

        <div className="flex flex-col gap-6">
          {canManage ? (
            <ReviewCard key={timesheet.id} timesheet={timesheet} />
          ) : (
            <Card className="h-fit gap-0 py-0">
              <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
                <CardTitle>Reviewer comment</CardTitle>
              </CardHeader>
              <p className="px-6 py-5 text-sm whitespace-pre-line text-muted-foreground">
                {timesheet.comment || "No comment yet."}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
