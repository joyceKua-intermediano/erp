"use client"

import Link from "next/link"
import { PlusIcon, RefreshCwIcon } from "lucide-react"
import { TimesheetStatusBadge } from "@/components/timesheets/timesheet-status-badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useMyVacationRequests } from "@/hooks/use-employee-vacation-requests"
import { formatDays, formatVacationRange, type VacationBalance } from "@/lib/vacations"

function formatSubmittedAt(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value))
}

const headClassName = "text-xs font-semibold tracking-wide text-primary uppercase"

export function VacationBalanceCards({ balance, isPending }: { balance: VacationBalance | null; isPending: boolean }) {
  const cards = [
    { label: "Accrued", value: balance?.accrued, hint: balance ? `${balance.annualDays} days a year` : null },
    { label: "Taken", value: balance?.taken, hint: "Approved requests" },
    { label: "Pending", value: balance?.pending, hint: "Awaiting review" },
    { label: "Available", value: balance?.available, hint: "You can request" },
  ]

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Vacation balance">
      {cards.map((card) => (
        <Card key={card.label} className="[--card-spacing:--spacing(5)]">
          <CardContent className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{card.label}</span>
            {isPending ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <span className="text-2xl font-semibold tabular-nums">
                {card.value === undefined ? "—" : formatDays(card.value)}
              </span>
            )}
            {card.hint && <span className="text-xs text-muted-foreground">{card.hint}</span>}
          </CardContent>
        </Card>
      ))}
    </section>
  )
}

export function MyVacationList() {
  const { data, isPending, isError, refetch } = useMyVacationRequests()
  const requests = data?.requests ?? []
  const balance = data?.balance ?? null
  const canCreate = balance !== null && balance.available > 0

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      <VacationBalanceCards balance={balance} isPending={isPending} />

      <Card className="gap-0 py-0">
        <CardHeader className="gap-4 border-b py-5 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-1">
            <CardTitle>My vacation requests</CardTitle>
            <CardDescription>
              {isPending
                ? "Loading…"
                : balance === null
                  ? "You need an employee contract before you can request vacation. Contact HR if this looks wrong."
                  : balance.available <= 0
                    ? "You don't have any vacation days available right now."
                    : data?.customerName
                      ? `New requests are sent to ${data.customerName} for review.`
                      : "Request time off and follow its review."}
            </CardDescription>
          </div>
          {canCreate ? (
            <Link href="/employee/vacations/new" className={buttonVariants()}>
              <PlusIcon />
              New request
            </Link>
          ) : (
            <Button disabled>
              <PlusIcon />
              New request
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow className="hover:bg-transparent">
                <TableHead className={`pl-6 ${headClassName}`}>Dates</TableHead>
                <TableHead className={`text-right ${headClassName}`}>Days</TableHead>
                <TableHead className={headClassName}>Status</TableHead>
                <TableHead className={`hidden pr-6 md:table-cell ${headClassName}`}>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                Array.from({ length: 3 }, (_, index) => (
                  <TableRow key={index}>
                    <TableCell className="pl-6">
                      <Skeleton className="h-4 w-44" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="hidden pr-6 md:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="py-12">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="text-sm text-muted-foreground">Your vacation requests couldn&apos;t be loaded.</p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCwIcon />
                        Try again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                    You haven&apos;t requested any vacation yet.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request.id} className="hover:bg-primary/5">
                    <TableCell className="pl-6">
                      <Link href={`/employee/vacations/${request.id}`} className="font-medium hover:text-primary">
                        {formatVacationRange(request.startDate, request.endDate)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatDays(request.numberOfDays)}
                    </TableCell>
                    <TableCell>
                      <TimesheetStatusBadge status={request.status} />
                    </TableCell>
                    <TableCell className="hidden pr-6 text-muted-foreground md:table-cell">
                      {formatSubmittedAt(request.submittedAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
