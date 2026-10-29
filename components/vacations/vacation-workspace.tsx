"use client"

import { useState } from "react"
import {
  CheckIcon,
  ClockAlertIcon,
  PlaneIcon,
  RefreshCwIcon,
  SearchIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"
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
import { useVacationRequests } from "@/hooks/use-vacation-requests"
import { SEARCH_DEBOUNCE_MS } from "@/lib/pagination"
import {
  formatDays,
  formatVacationRange,
  vacationStatusLabels,
  vacationStatuses,
  type VacationStatus,
} from "@/lib/vacations"
import { ReviewVacationDialog, type VacationReview } from "./review-vacation-dialog"

const CHOOSE_CLUSTER_DESCRIPTION = "Vacation requests are scoped to one Intermediano legal entity at a time."

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

export function VacationWorkspace({ canManage }: { canManage: boolean }) {
  const activeCluster = useActiveCluster()

  if (!activeCluster) return <ChooseClusterCard description={CHOOSE_CLUSTER_DESCRIPTION} />
  if (!activeCluster.modules.includes("employees")) {
    return <ModuleDisabledCard module="employees" clusterLabel={activeCluster.label} />
  }

  return <ClusterVacationPanel key={activeCluster.id} clusterLabel={activeCluster.label} canManage={canManage} />
}

function ClusterVacationPanel({ clusterLabel, canManage }: { clusterLabel: string; canManage: boolean }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<VacationStatus | null>(null)
  const [page, setPage] = useState(1)
  const [review, setReview] = useState<VacationReview | null>(null)
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const { data, isPending, isError, isFetching, refetch } = useVacationRequests({
    page,
    search: debouncedSearch,
    status: statusFilter,
  })

  const visibleRequests = data?.requests ?? []
  const clusterTotal = data?.stats.requests ?? 0
  const trimmedSearch = search.trim()

  // Any change to the filters starts again from the first page.
  function updateFilters(apply: () => void) {
    apply()
    setPage(1)
  }

  const stats = [
    { label: "Requests", value: clusterTotal, icon: PlaneIcon },
    { label: "Awaiting review", value: data?.stats.pending ?? 0, icon: ClockAlertIcon },
    { label: "Employees", value: data?.stats.employees ?? 0, icon: UsersIcon },
  ]

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      <section className="grid gap-4 sm:grid-cols-3" aria-label={`${clusterLabel} vacation summary`}>
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
              Vacation requests
              <Badge variant="outline" className="border-primary/30 text-primary">
                {clusterLabel}
              </Badge>
            </CardTitle>
            <CardDescription>Time off requested by employees of this legal entity.</CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => updateFilters(() => setSearch(event.target.value))}
              placeholder="Search employee or customer…"
              aria-label="Search vacation requests"
              className="pl-8 focus-visible:border-primary focus-visible:ring-primary/25"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <FilterBadge isActive={statusFilter === null} onClick={() => updateFilters(() => setStatusFilter(null))}>
              All statuses
            </FilterBadge>
            {vacationStatuses.map((status) => (
              <FilterBadge
                key={status}
                isActive={statusFilter === status}
                onClick={() => updateFilters(() => setStatusFilter(status))}
              >
                {vacationStatusLabels[status]}
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
                <TableHead className={`hidden md:table-cell ${headClassName}`}>Dates</TableHead>
                <TableHead className={`text-right ${headClassName}`}>Days</TableHead>
                <TableHead className={headClassName}>Status</TableHead>
                <TableHead className={`hidden lg:table-cell ${headClassName}`}>Submitted</TableHead>
                <TableHead className="w-44 pr-6">
                  <span className="sr-only">Actions</span>
                </TableHead>
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
                      <Skeleton className="ml-auto h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="pr-6" />
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-12">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="text-sm text-muted-foreground">
                        Vacation requests for {clusterLabel} couldn&apos;t be loaded.
                      </p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCwIcon />
                        Try again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : visibleRequests.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    {clusterTotal === 0
                      ? `No vacation requests in ${clusterLabel} yet.`
                      : "No vacation requests match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                visibleRequests.map((request) => {
                  const range = formatVacationRange(request.startDate, request.endDate)
                  return (
                    <TableRow key={request.id} className="hover:bg-primary/5">
                      <TableCell className="pl-6">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{request.employeeName}</span>
                          <span className="text-xs text-muted-foreground">
                            <span className="md:hidden">{range} · </span>
                            {request.companyName ?? "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{range}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatDays(request.numberOfDays)}
                      </TableCell>
                      <TableCell>
                        <TimesheetStatusBadge status={request.status} />
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {formatSubmittedAt(request.submittedAt)}
                      </TableCell>
                      <TableCell className="pr-6">
                        {canManage && request.status === "pending" && (
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReview({ request, status: "approved" })}
                              aria-label={`Approve ${request.employeeName}'s vacation for ${range}`}
                            >
                              <CheckIcon />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setReview({ request, status: "rejected" })}
                              aria-label={`Reject ${request.employeeName}'s vacation for ${range}`}
                            >
                              <XIcon />
                              Reject
                            </Button>
                          </div>
                        )}
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

      <ReviewVacationDialog review={review} onOpenChange={(open) => !open && setReview(null)} />
    </div>
  )
}
