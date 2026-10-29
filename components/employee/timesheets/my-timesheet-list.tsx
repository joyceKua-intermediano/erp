"use client"

import Link from "next/link"
import { PlusIcon, RefreshCwIcon } from "lucide-react"
import { TimesheetStatusBadge } from "@/components/timesheets/timesheet-status-badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useMyTimesheets } from "@/hooks/use-employee-timesheets"
import { formatHours, formatPeriod } from "@/lib/timesheets"

function formatSubmittedAt(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value))
}

const headClassName = "text-xs font-semibold tracking-wide text-primary uppercase"

export function MyTimesheetList() {
  const { data, isPending, isError, refetch } = useMyTimesheets()
  const timesheets = data?.timesheets ?? []
  const isEnabled = data?.timesheetsEnabled ?? false
  const canCreate = isEnabled && (data?.hasContract ?? false)

  return (
    <Card className="animate-in gap-0 py-0 duration-300 fade-in-0 slide-in-from-bottom-2">
      <CardHeader className="gap-4 border-b py-5 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-1">
          <CardTitle>My timesheets</CardTitle>
          <CardDescription>
            {isPending
              ? "Loading…"
              : !isEnabled
                ? "Timesheets aren't available for your entity. Contact HR if this looks wrong."
                : !canCreate
                  ? "You need an active contract before you can submit timesheets. Contact HR if this looks wrong."
                  : data?.customerName
                    ? `New timesheets are sent to ${data.customerName} for review.`
                    : "Submit your hours once a month for review."}
          </CardDescription>
        </div>
        {canCreate ? (
          <Link href="/employee/timesheets/new" className={buttonVariants()}>
            <PlusIcon />
            New timesheet
          </Link>
        ) : (
          <Button disabled>
            <PlusIcon />
            New timesheet
          </Button>
        )}
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader className="bg-primary/5">
            <TableRow className="hover:bg-transparent">
              <TableHead className={`pl-6 ${headClassName}`}>Period</TableHead>
              <TableHead className={`text-right ${headClassName}`}>Total hours</TableHead>
              <TableHead className={headClassName}>Status</TableHead>
              <TableHead className={`hidden md:table-cell ${headClassName}`}>Submitted</TableHead>
              <TableHead className={`hidden pr-6 lg:table-cell ${headClassName}`}>Reviewer comment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 3 }, (_, index) => (
                <TableRow key={index}>
                  <TableCell className="pl-6">
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="hidden pr-6 lg:table-cell">
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-12">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <p className="text-sm text-muted-foreground">Your timesheets couldn&apos;t be loaded.</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                      <RefreshCwIcon />
                      Try again
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : timesheets.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  You haven&apos;t submitted any timesheets yet.
                </TableCell>
              </TableRow>
            ) : (
              timesheets.map((timesheet) => (
                <TableRow key={timesheet.id} className="hover:bg-primary/5">
                  <TableCell className="pl-6">
                    <Link
                      href={`/employee/timesheets/${timesheet.id}`}
                      className="font-medium hover:text-primary"
                    >
                      {formatPeriod(timesheet.year, timesheet.month)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatHours(timesheet.totalHours)} hrs
                  </TableCell>
                  <TableCell>
                    <TimesheetStatusBadge status={timesheet.status} />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {formatSubmittedAt(timesheet.submittedAt)}
                  </TableCell>
                  <TableCell className="hidden max-w-64 truncate pr-6 text-muted-foreground lg:table-cell">
                    {timesheet.comment || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
