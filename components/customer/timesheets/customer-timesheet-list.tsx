"use client"

import { useState } from "react"
import Link from "next/link"
import { CalendarClockIcon, ClockAlertIcon, EyeIcon, UsersIcon } from "lucide-react"
import {
  ClearSearchBadge,
  ErrorRow,
  FilterBadge,
  formatSubmittedAt,
  headClassName,
  MessageRow,
  ResultCount,
  SearchInput,
  SkeletonRows,
  StatCards,
} from "@/components/customer/list-parts"
import { TimesheetStatusBadge } from "@/components/timesheets/timesheet-status-badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePager } from "@/components/table-pager"
import { useCustomerTimesheets } from "@/hooks/use-customer-timesheets"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { SEARCH_DEBOUNCE_MS } from "@/lib/pagination"
import {
  formatHours,
  formatPeriod,
  timesheetStatusLabels,
  timesheetStatuses,
  type TimesheetStatus,
} from "@/lib/timesheets"

const COLUMNS = 5

export function CustomerTimesheetList() {
  const [search, setSearch] = useState("")
  const [month, setMonth] = useState("")
  // Reviewers usually come here for what's waiting, so that's the starting filter.
  const [statusFilter, setStatusFilter] = useState<TimesheetStatus | null>("pending")
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const { data, isPending, isError, isFetching, refetch } = useCustomerTimesheets({
    page,
    search: debouncedSearch,
    month,
    status: statusFilter,
  })

  const timesheets = data?.timesheets ?? []
  const scopeTotal = data?.stats.timesheets ?? 0

  // Any change to the filters starts again from the first page.
  function updateFilters(apply: () => void) {
    apply()
    setPage(1)
  }

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      <StatCards
        label="Timesheet summary"
        isPending={isPending}
        stats={[
          { label: "Timesheets", value: scopeTotal, icon: CalendarClockIcon },
          { label: "Awaiting your review", value: data?.stats.pending ?? 0, icon: ClockAlertIcon },
          { label: "Employees", value: data?.stats.employees ?? 0, icon: UsersIcon },
        ]}
      />

      <Card className="gap-0 py-0">
        <CardHeader className="gap-4 border-b py-5 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-1">
            <CardTitle>Timesheets</CardTitle>
            <CardDescription>Monthly hours your team submitted for approval.</CardDescription>
          </div>
          <SearchInput
            value={search}
            onChange={(value) => updateFilters(() => setSearch(value))}
            placeholder="Search employee…"
            label="Search timesheets"
          />
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
            <ClearSearchBadge search={search.trim()} onClear={() => updateFilters(() => setSearch(""))} />
            <ResultCount isPending={isPending} isFetching={isFetching} total={data?.total ?? 0} scopeTotal={scopeTotal} />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow className="hover:bg-transparent">
                <TableHead className={`pl-6 ${headClassName}`}>Employee</TableHead>
                <TableHead className={`text-right ${headClassName}`}>Total hours</TableHead>
                <TableHead className={headClassName}>Status</TableHead>
                <TableHead className={`hidden lg:table-cell ${headClassName}`}>Submitted</TableHead>
                <TableHead className="w-24 pr-6">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody key={isPending ? "loading" : "ready"} className="animate-in duration-300 fade-in-0">
              {isPending ? (
                <SkeletonRows columns={COLUMNS} />
              ) : isError ? (
                <ErrorRow columns={COLUMNS} message="Your team's timesheets couldn't be loaded." onRetry={() => refetch()} />
              ) : timesheets.length === 0 ? (
                <MessageRow columns={COLUMNS}>
                  {scopeTotal === 0 ? "Your team hasn't submitted any timesheets yet." : "No timesheets match your filters."}
                </MessageRow>
              ) : (
                timesheets.map((timesheet) => {
                  const href = `/customer/timesheets/${timesheet.id}`
                  const period = formatPeriod(timesheet.year, timesheet.month)
                  return (
                    <TableRow key={timesheet.id} className="hover:bg-primary/5">
                      <TableCell className="pl-6">
                        <Link href={href} className="group flex flex-col gap-1">
                          <span className="font-medium group-hover:text-primary">{timesheet.employeeName}</span>
                          <span className="text-xs text-muted-foreground">{period}</span>
                        </Link>
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
                        <Link
                          href={href}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                          aria-label={`Review the ${period} timesheet of ${timesheet.employeeName}`}
                        >
                          <EyeIcon />
                          {timesheet.status === "pending" ? "Review" : "View"}
                        </Link>
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
