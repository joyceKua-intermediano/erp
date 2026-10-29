"use client"

import { useState } from "react"
import Link from "next/link"
import {
  CalendarClockIcon,
  ClockAlertIcon,
  EyeIcon,
  FileDownIcon,
  MoreHorizontalIcon,
  RefreshCwIcon,
  SearchIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"
import { cn } from "cn"
import { ChooseClusterCard, ModuleDisabledCard } from "@/components/employees/employee-workspace"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePager } from "@/components/table-pager"
import { useActiveCluster } from "@/hooks/use-clusters"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useTimesheets } from "@/hooks/use-timesheets"
import { SEARCH_DEBOUNCE_MS } from "@/lib/pagination"
import { TimesheetStatusBadge } from "./timesheet-status-badge"
import {
  formatHours,
  formatPeriod,
  timesheetStatusLabels,
  timesheetStatuses,
  type TimesheetStatus,
} from "@/lib/timesheets"

const CHOOSE_CLUSTER_DESCRIPTION = "Timesheets are scoped to one Intermediano legal entity at a time."

export function timesheetCsvUrl(timesheetId: string, clusterId: string) {
  return `/api/timesheets/${timesheetId}/csv?cluster=${encodeURIComponent(clusterId)}`
}

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

export function TimesheetWorkspace() {
  const activeCluster = useActiveCluster()

  if (!activeCluster) return <ChooseClusterCard description={CHOOSE_CLUSTER_DESCRIPTION} />
  if (!activeCluster.modules.includes("timesheets")) {
    return <ModuleDisabledCard module="timesheets" clusterLabel={activeCluster.label} />
  }

  return <ClusterTimesheetPanel key={activeCluster.id} clusterId={activeCluster.id} clusterLabel={activeCluster.label} />
}

function ClusterTimesheetPanel({ clusterId, clusterLabel }: { clusterId: string; clusterLabel: string }) {
  const [search, setSearch] = useState("")
  const [month, setMonth] = useState("")
  const [statusFilter, setStatusFilter] = useState<TimesheetStatus | null>(null)
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const { data, isPending, isError, isFetching, refetch } = useTimesheets({
    page,
    search: debouncedSearch,
    month,
    status: statusFilter,
  })

  const visibleTimesheets = data?.timesheets ?? []
  const clusterTotal = data?.stats.timesheets ?? 0
  const trimmedSearch = search.trim()

  // Any change to the filters starts again from the first page.
  function updateFilters(apply: () => void) {
    apply()
    setPage(1)
  }

  const stats = [
    { label: "Timesheets", value: clusterTotal, icon: CalendarClockIcon },
    { label: "Awaiting review", value: data?.stats.pending ?? 0, icon: ClockAlertIcon },
    { label: "Employees", value: data?.stats.employees ?? 0, icon: UsersIcon },
  ]

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      <section className="grid gap-4 sm:grid-cols-3" aria-label={`${clusterLabel} timesheet summary`}>
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
              Timesheets
              <Badge variant="outline" className="border-primary/30 text-primary">
                {clusterLabel}
              </Badge>
            </CardTitle>
            <CardDescription>Monthly hours submitted by employees of this legal entity.</CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => updateFilters(() => setSearch(event.target.value))}
              placeholder="Search employee or customer…"
              aria-label="Search timesheets"
              className="pl-8 focus-visible:border-primary focus-visible:ring-primary/25"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <Input
              type="month"
              value={month}
              onChange={(event) => updateFilters(() => setMonth(event.target.value))}
              aria-label="Filter by month"
              className="h-7 w-40 text-xs focus-visible:border-primary focus-visible:ring-primary/25"
            />
            <FilterBadge isActive={statusFilter === null} onClick={() => updateFilters(() => setStatusFilter(null))}>
              All statuses
            </FilterBadge>
            {timesheetStatuses.map((status) => (
              <FilterBadge
                key={status}
                isActive={statusFilter === status}
                onClick={() => updateFilters(() => setStatusFilter(status))}
              >
                {timesheetStatusLabels[status]}
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
                <TableHead className="pl-6 text-xs font-semibold tracking-wide text-primary uppercase">Employee</TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase md:table-cell">
                  Customer
                </TableHead>
                <TableHead className="text-right text-xs font-semibold tracking-wide text-primary uppercase">
                  Total hours
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wide text-primary uppercase">Status</TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase lg:table-cell">
                  Submitted
                </TableHead>
                <TableHead className="w-14 pr-6">
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
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-4 w-16" />
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
                      <p className="text-sm text-muted-foreground">Timesheets for {clusterLabel} couldn&apos;t be loaded.</p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCwIcon />
                        Try again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : visibleTimesheets.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    {clusterTotal === 0 ? `No timesheets in ${clusterLabel} yet.` : "No timesheets match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                visibleTimesheets.map((timesheet) => {
                  const href = `/admin/timesheets/${timesheet.id}`
                  const period = formatPeriod(timesheet.year, timesheet.month)
                  return (
                    <TableRow key={timesheet.id} className="hover:bg-primary/5">
                      <TableCell className="pl-6">
                        <Link href={href} className="group flex flex-col gap-1">
                          <span className="font-medium group-hover:text-primary">{timesheet.employeeName}</span>
                          <span className="text-xs text-muted-foreground">
                            {period}
                            {timesheet.companyName && <span className="md:hidden"> · {timesheet.companyName}</span>}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {timesheet.companyName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatHours(timesheet.totalHours)} hrs
                      </TableCell>
                      <TableCell>
                        <TimesheetStatusBadge status={timesheet.status} />
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {formatSubmittedAt(timesheet.submittedAt)}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions for the ${period} timesheet of ${timesheet.employeeName}`}
                              >
                                <MoreHorizontalIcon />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem render={<Link href={href} />}>
                              <EyeIcon />
                              View timesheet
                            </DropdownMenuItem>
                            <DropdownMenuItem render={<a href={timesheetCsvUrl(timesheet.id, clusterId)} download />}>
                              <FileDownIcon />
                              Export CSV
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
