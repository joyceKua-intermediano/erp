"use client"

import { useId, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, Loader2Icon, LockIcon, RefreshCwIcon, Trash2Icon } from "lucide-react"
import { TimesheetStatusBadge } from "@/components/timesheets/timesheet-status-badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useDeleteMyVacationRequest,
  useMyVacationRequest,
  useMyVacationRequests,
  useSaveMyVacationRequest,
} from "@/hooks/use-employee-vacation-requests"
import {
  countWorkingDays,
  formatDays,
  formatVacationRange,
  vacationFormSchema,
  type MyVacationRequests,
  type VacationRequestItem,
} from "@/lib/vacations"

const backLink = (
  <Link
    href="/employee/vacations"
    className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit text-muted-foreground" })}
  >
    <ArrowLeftIcon />
    My vacation requests
  </Link>
)

function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {backLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">{message}</p>
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

export function MyVacationEditor({ requestId }: { requestId: string | null }) {
  const overview = useMyVacationRequests()

  if (overview.isPending) return <Skeleton className="h-96 rounded-xl" />
  if (overview.isError) {
    return <LoadError message="Your vacation balance couldn't be loaded." onRetry={() => overview.refetch()} />
  }
  if (!requestId) return <MyVacationForm request={null} overview={overview.data} />
  return <ExistingVacationRequest requestId={requestId} overview={overview.data} />
}

function ExistingVacationRequest({ requestId, overview }: { requestId: string; overview: MyVacationRequests }) {
  const { data: request, isPending, isError, refetch } = useMyVacationRequest(requestId)

  if (isPending) return <Skeleton className="h-96 rounded-xl" />
  if (isError) return <LoadError message="This vacation request couldn't be loaded." onRetry={() => refetch()} />
  if (!request) return <LoadError message="This vacation request doesn't exist or isn't yours." />

  return <MyVacationForm key={request.id} request={request} overview={overview} />
}

function MyVacationForm({ request, overview }: { request: VacationRequestItem | null; overview: MyVacationRequests }) {
  const router = useRouter()
  const startId = useId()
  const endId = useId()
  const daysId = useId()
  const saveRequest = useSaveMyVacationRequest()
  const [startDate, setStartDate] = useState(request?.startDate ?? "")
  const [endDate, setEndDate] = useState(request?.endDate ?? "")
  const [daysInput, setDaysInput] = useState(request ? String(request.numberOfDays) : "")
  const [isSaved, setSaved] = useState(false)
  const [isDeleteOpen, setDeleteOpen] = useState(false)

  const holidayDates = useMemo(() => new Set(overview.holidayDates), [overview.holidayDates])
  const balance = overview.balance
  const isLocked = request?.status === "approved"
  // The server leaves this request's own pending days out of the balance when it's edited.
  const available = balance
    ? Math.round((balance.available + (request?.status === "pending" ? request.numberOfDays : 0)) * 100) / 100
    : 0
  const numberOfDays = daysInput.trim() === "" ? Number.NaN : Number(daysInput)
  const parsed = vacationFormSchema.safeParse({ startDate, endDate, numberOfDays })
  const formError = !startDate || !endDate ? null : parsed.success ? null : (parsed.error.issues[0]?.message ?? null)
  const overBalance = parsed.success && parsed.data.numberOfDays > available
  const canSave = balance !== null && parsed.success && !overBalance && !isLocked

  function changeDates(nextStart: string, nextEnd: string) {
    setSaved(false)
    setStartDate(nextStart)
    setEndDate(nextEnd)
    if (nextStart && nextEnd && nextEnd >= nextStart) {
      setDaysInput(String(countWorkingDays(nextStart, nextEnd, holidayDates)))
    }
  }

  function handleSave() {
    if (!canSave || !parsed.success) return
    setSaved(false)
    saveRequest.mutate(
      { requestId: request?.id ?? null, input: parsed.data },
      {
        onSuccess: () => {
          if (request) setSaved(true)
          else router.push("/employee/vacations")
        },
      }
    )
  }

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      {backLink}

      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              {request ? formatVacationRange(request.startDate, request.endDate) : "New vacation request"}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {request && <TimesheetStatusBadge status={request.status} />}
              {overview.customerName && <span>Reviewed by {overview.customerName}</span>}
            </div>
          </div>
          <div className="flex flex-col sm:items-end">
            <span className="text-xs text-muted-foreground">Available</span>
            <span className="text-2xl font-semibold tabular-nums">{formatDays(available)}</span>
          </div>
        </CardContent>
      </Card>

      {balance === null && (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          You need an employee contract before you can request vacation. Contact HR if this looks wrong.
        </p>
      )}
      {isLocked && (
        <p className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          <LockIcon className="size-4" />
          This request has been approved, so it can no longer be changed.
        </p>
      )}
      {request?.status === "rejected" && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          This request was rejected. Change the dates and save to send it for review again.
        </p>
      )}

      <Card className="gap-0 py-0">
        <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
          <CardTitle>Time off</CardTitle>
          <CardDescription>
            Choose your first and last day off. The number of days is filled in with the working days in between,
            leaving out weekends and public holidays; change it if your schedule differs.
          </CardDescription>
        </CardHeader>
        <div className="grid gap-5 px-6 py-5 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor={startId}>First day</FieldLabel>
            <Input
              id={startId}
              type="date"
              value={startDate}
              disabled={isLocked}
              onChange={(event) => changeDates(event.target.value, endDate)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={endId}>Last day</FieldLabel>
            <Input
              id={endId}
              type="date"
              value={endDate}
              min={startDate || undefined}
              disabled={isLocked}
              onChange={(event) => changeDates(startDate, event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={daysId}>Number of days</FieldLabel>
            <Input
              id={daysId}
              type="number"
              inputMode="decimal"
              min={0.5}
              step={0.5}
              value={daysInput}
              disabled={isLocked}
              aria-invalid={overBalance || undefined}
              onChange={(event) => {
                setSaved(false)
                setDaysInput(event.target.value)
              }}
              className="tabular-nums"
            />
            <FieldDescription>In steps of 0.5.</FieldDescription>
          </Field>
        </div>
      </Card>

      {!isLocked && (
        <div className="flex flex-col items-end gap-2">
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          {overBalance && (
            <p role="alert" className="text-sm text-destructive">
              You only have {formatDays(available)} available.
            </p>
          )}
          {saveRequest.isError && (
            <p role="alert" className="text-sm text-destructive">
              {saveRequest.error.message}
            </p>
          )}
          {isSaved && !saveRequest.isPending && (
            <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
              Saved and sent for review.
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {request && (
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2Icon />
                Delete request
              </Button>
            )}
            <Button onClick={handleSave} disabled={!canSave || saveRequest.isPending}>
              {saveRequest.isPending && <Loader2Icon className="animate-spin" />}
              {request ? "Save and resubmit" : "Submit request"}
            </Button>
          </div>
        </div>
      )}

      {request && !isLocked && (
        <DeleteVacationDialog request={request} open={isDeleteOpen} onOpenChange={setDeleteOpen} />
      )}
    </div>
  )
}

type DeleteVacationDialogProps = {
  request: VacationRequestItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

function DeleteVacationDialog({ request, open, onOpenChange }: DeleteVacationDialogProps) {
  const router = useRouter()
  const deleteRequest = useDeleteMyVacationRequest()

  function handleOpenChange(open: boolean) {
    if (!open) deleteRequest.reset()
    onOpenChange(open)
  }

  function handleDelete() {
    deleteRequest.mutate(request.id, { onSuccess: () => router.push("/employee/vacations") })
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete this vacation request?</AlertDialogTitle>
          <AlertDialogDescription>
            {formatVacationRange(request.startDate, request.endDate)} · {formatDays(request.numberOfDays)}. The request
            is removed for good and its days return to your balance.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteRequest.isError && (
          <p role="alert" className="text-sm text-destructive">
            {deleteRequest.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteRequest.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={deleteRequest.isPending}>
            {deleteRequest.isPending && <Loader2Icon className="animate-spin" />}
            Delete request
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
