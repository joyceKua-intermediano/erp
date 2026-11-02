"use client"

import Link from "next/link"
import { PlusIcon, RefreshCwIcon } from "lucide-react"
import { TimesheetStatusBadge } from "@/components/timesheets/timesheet-status-badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useMyExpenseClaims } from "@/hooks/use-employee-expenses"
import { claimCurrency, expenseClaimTitle, expenseTypeLabels, formatMoney } from "@/lib/expenses"

function formatSubmittedAt(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value))
}

const headClassName = "text-xs font-semibold tracking-wide text-primary uppercase"

export function MyExpenseList() {
  const { data, isPending, isError, refetch } = useMyExpenseClaims()
  const claims = data?.claims ?? []
  const contract = data?.contract ?? null
  const canCreate = contract !== null && contract.hasCustomer
  const pending = claims.filter((claim) => claim.status === "pending").length
  const approved = claims.filter((claim) => claim.status === "approved").length

  const stats = [
    { label: "Claims", value: claims.length },
    { label: "Awaiting review", value: pending },
    { label: "Approved", value: approved },
  ]

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Expense summary">
        {stats.map((stat) => (
          <Card key={stat.label} className="[--card-spacing:--spacing(5)]">
            <CardContent className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              {isPending ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <span className="text-2xl font-semibold tabular-nums">{stat.value}</span>
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="gap-0 py-0">
        <CardHeader className="gap-4 border-b py-5 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-1">
            <CardTitle>My expense claims</CardTitle>
            <CardDescription>
              {isPending
                ? "Loading…"
                : contract === null
                  ? "You need a contract before you can claim expenses. Contact HR if this looks wrong."
                  : !contract.hasCustomer
                    ? "Your contract has no customer to review expenses yet. Contact HR."
                    : contract.customerName
                      ? `New claims are sent to ${contract.customerName} for review.`
                      : "Claim expenses with their receipts and follow their review."}
            </CardDescription>
          </div>
          {canCreate ? (
            <Link href="/employee/expenses/new" className={buttonVariants()}>
              <PlusIcon />
              New claim
            </Link>
          ) : (
            <Button disabled>
              <PlusIcon />
              New claim
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow className="hover:bg-transparent">
                <TableHead className={`pl-6 ${headClassName}`}>Claim</TableHead>
                <TableHead className={`hidden sm:table-cell ${headClassName}`}>Type</TableHead>
                <TableHead className={`hidden text-right md:table-cell ${headClassName}`}>Items</TableHead>
                <TableHead className={`text-right ${headClassName}`}>Total</TableHead>
                <TableHead className={headClassName}>Status</TableHead>
                <TableHead className={`hidden pr-6 lg:table-cell ${headClassName}`}>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                Array.from({ length: 3 }, (_, index) => (
                  <TableRow key={index}>
                    <TableCell className="pl-6">
                      <Skeleton className="h-4 w-44" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="ml-auto h-4 w-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="hidden pr-6 lg:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-12">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="text-sm text-muted-foreground">Your expense claims couldn&apos;t be loaded.</p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCwIcon />
                        Try again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : claims.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    You haven&apos;t claimed any expenses yet.
                  </TableCell>
                </TableRow>
              ) : (
                claims.map((claim) => (
                  <TableRow key={claim.id} className="hover:bg-primary/5">
                    <TableCell className="pl-6">
                      <div className="flex flex-col gap-1">
                        <Link href={`/employee/expenses/${claim.id}`} className="font-medium hover:text-primary">
                          {expenseClaimTitle(claim)}
                        </Link>
                        {claim.costCenter && (
                          <span className="text-xs text-muted-foreground">Cost center {claim.costCenter}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {claim.type ? expenseTypeLabels[claim.type] : "—"}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">{claim.lines.length}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMoney(claim.totals.claimed, claimCurrency(claim))}
                    </TableCell>
                    <TableCell>
                      <TimesheetStatusBadge status={claim.status} />
                    </TableCell>
                    <TableCell className="hidden pr-6 text-muted-foreground lg:table-cell">
                      {formatSubmittedAt(claim.submittedAt)}
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
