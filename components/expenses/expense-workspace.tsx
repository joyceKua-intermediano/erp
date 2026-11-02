"use client"

import { useState } from "react"
import Link from "next/link"
import { ClockAlertIcon, RefreshCwIcon, SearchIcon, UsersIcon, WalletIcon, XIcon } from "lucide-react"
import { cn } from "cn"
import { ChooseClusterCard, ModuleDisabledCard } from "@/components/employees/employee-workspace"
import { TimesheetStatusBadge } from "@/components/timesheets/timesheet-status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePager } from "@/components/table-pager"
import { useActiveCluster } from "@/hooks/use-clusters"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useExpenseClaims } from "@/hooks/use-expenses"
import {
  claimCurrency,
  expenseClaimTitle,
  expenseStatuses,
  expenseStatusLabels,
  expenseTypeLabels,
  formatMoney,
  type ExpenseStatus,
} from "@/lib/expenses"
import { SEARCH_DEBOUNCE_MS } from "@/lib/pagination"

export const CHOOSE_CLUSTER_DESCRIPTION = "Expense claims are scoped to one Intermediano legal entity at a time."

const headClassName = "text-xs font-semibold tracking-wide text-primary uppercase"

function formatSubmittedAt(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value))
}

function FilterBadge({ isActive, onClick, children }: { isActive: boolean; onClick: () => void; children: string }) {
  return (
    <Badge
      render={<button type="button" onClick={onClick} />}
      aria-pressed={isActive}
      className={cn(
        "cursor-pointer",
        isActive ? "bg-primary text-primary-foreground hover:bg-primary/85" : "bg-primary/10 text-primary hover:bg-primary/15"
      )}
    >
      {children}
    </Badge>
  )
}

export function ExpenseWorkspace() {
  const activeCluster = useActiveCluster()

  if (!activeCluster) return <ChooseClusterCard description={CHOOSE_CLUSTER_DESCRIPTION} />
  if (!activeCluster.modules.includes("expenses")) {
    return <ModuleDisabledCard module="expenses" clusterLabel={activeCluster.label} />
  }

  return <ClusterExpensePanel key={activeCluster.id} clusterLabel={activeCluster.label} />
}

function ClusterExpensePanel({ clusterLabel }: { clusterLabel: string }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | null>(null)
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const { data, isPending, isError, isFetching, refetch } = useExpenseClaims({
    page,
    search: debouncedSearch,
    status: statusFilter,
  })

  const visibleClaims = data?.claims ?? []
  const clusterTotal = data?.stats.claims ?? 0
  const trimmedSearch = search.trim()

  // Any change to the filters starts again from the first page.
  function updateFilters(apply: () => void) {
    apply()
    setPage(1)
  }

  const stats = [
    { label: "Claims", value: clusterTotal, icon: WalletIcon },
    { label: "Awaiting review", value: data?.stats.pending ?? 0, icon: ClockAlertIcon },
    { label: "Employees", value: data?.stats.employees ?? 0, icon: UsersIcon },
  ]

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      <section className="grid gap-4 sm:grid-cols-3" aria-label={`${clusterLabel} expense summary`}>
        {stats.map((stat) => (
          <Card key={stat.label} className="[--card-spacing:--spacing(5)]">
            <CardContent className="flex items-center gap-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <stat.icon className="size-5" />
              </span>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                {isPending ? (
                  <Skeleton className="mt-1 h-6 w-10" />
                ) : (
                  <span className="text-2xl font-semibold tabular-nums">{stat.value}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="gap-0 py-0">
        <CardHeader className="gap-4 border-b py-5 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              Expense claims
              <Badge variant="outline" className="border-primary/30 text-primary">
                {clusterLabel}
              </Badge>
            </CardTitle>
            <CardDescription>Expenses claimed by employees of this legal entity, with their receipts.</CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => updateFilters(() => setSearch(event.target.value))}
              placeholder="Search employee, customer or cost center…"
              aria-label="Search expense claims"
              className="pl-8 focus-visible:border-primary focus-visible:ring-primary/25"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <FilterBadge isActive={statusFilter === null} onClick={() => updateFilters(() => setStatusFilter(null))}>
              All statuses
            </FilterBadge>
            {expenseStatuses.map((status) => (
              <FilterBadge
                key={status}
                isActive={statusFilter === status}
                onClick={() => updateFilters(() => setStatusFilter(status))}
              >
                {expenseStatusLabels[status]}
              </FilterBadge>
            ))}
            {trimmedSearch && (
              <Badge
                render={<button type="button" onClick={() => updateFilters(() => setSearch(""))} />}
                variant="outline"
                className="cursor-pointer gap-1"
              >
                &ldquo;{trimmedSearch}&rdquo;
                <XIcon className="size-3" />
                <span className="sr-only">Clear search</span>
              </Badge>
            )}
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {isPending ? "Loading…" : `${data?.total ?? 0} of ${clusterTotal}`}
            </span>
            {isFetching && !isPending && (
              <RefreshCwIcon className="size-3.5 animate-spin text-primary" aria-label="Refreshing" />
            )}
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow className="hover:bg-transparent">
                <TableHead className={`pl-6 ${headClassName}`}>Employee</TableHead>
                <TableHead className={`hidden md:table-cell ${headClassName}`}>Claim</TableHead>
                <TableHead className={`text-right ${headClassName}`}>Total</TableHead>
                <TableHead className={headClassName}>Status</TableHead>
                <TableHead className={`hidden pr-6 lg:table-cell ${headClassName}`}>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody key={isPending ? "loading" : "ready"} className="animate-in duration-300 fade-in-0">
              {isPending ? (
                Array.from({ length: 4 }, (_, index) => (
                  <TableRow key={index}>
                    <TableCell className="pl-6">
                      <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-40" />
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
                  <TableCell colSpan={5} className="py-12">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="text-sm text-muted-foreground">
                        Expense claims for {clusterLabel} couldn&apos;t be loaded.
                      </p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCwIcon />
                        Try again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : visibleClaims.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    {clusterTotal === 0 ? `No expense claims in ${clusterLabel} yet.` : "No expense claims match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                visibleClaims.map((claim) => {
                  const pendingItems = claim.lines.filter((line) => line.status === "pending").length
                  return (
                    <TableRow key={claim.id} className="hover:bg-primary/5">
                      <TableCell className="pl-6">
                        <Link href={`/admin/expenses/${claim.id}`} className="group flex flex-col gap-1">
                          <span className="font-medium group-hover:text-primary">{claim.employeeName}</span>
                          <span className="text-xs text-muted-foreground">{claim.companyName ?? "—"}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col gap-1">
                          <span>{expenseClaimTitle(claim)}</span>
                          <span className="text-xs text-muted-foreground">
                            {claim.type ? expenseTypeLabels[claim.type] : "No type"} · {claim.lines.length}{" "}
                            {claim.lines.length === 1 ? "item" : "items"}
                            {pendingItems > 0 && claim.status !== "approved" && ` · ${pendingItems} to review`}
                          </span>
                        </div>
                      </TableCell>
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
                  )
                })
              )}
            </TableBody>
          </Table>
          {data && <TablePager page={page} total={data.total} onPageChange={setPage} isFetching={isFetching} />}
        </CardContent>
      </Card>
    </div>
  )
}
