"use client"

import { useState } from "react"
import { CheckIcon, ClockAlertIcon, PlaneIcon, UsersIcon, XIcon } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePager } from "@/components/table-pager"
import { ReviewVacationDialogView, type VacationReview } from "@/components/vacations/review-vacation-dialog"
import { useCustomerVacationRequests, useReviewCustomerVacationRequest } from "@/hooks/use-customer-vacations"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { SEARCH_DEBOUNCE_MS } from "@/lib/pagination"
import {
  formatDays,
  formatVacationRange,
  vacationStatusLabels,
  vacationStatuses,
  type VacationStatus,
} from "@/lib/vacations"

const COLUMNS = 5

export function CustomerVacationList() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<VacationStatus | null>("pending")
  const [page, setPage] = useState(1)
  const [review, setReview] = useState<VacationReview | null>(null)
  const reviewRequest = useReviewCustomerVacationRequest()
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const { data, isPending, isError, isFetching, refetch } = useCustomerVacationRequests({
    page,
    search: debouncedSearch,
    status: statusFilter,
  })

  const requests = data?.requests ?? []
  const scopeTotal = data?.stats.requests ?? 0

  // Any change to the filters starts again from the first page.
  function updateFilters(apply: () => void) {
    apply()
    setPage(1)
  }

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      <StatCards
        label="Vacation request summary"
        isPending={isPending}
        stats={[
          { label: "Requests", value: scopeTotal, icon: PlaneIcon },
          { label: "Awaiting your review", value: data?.stats.pending ?? 0, icon: ClockAlertIcon },
          { label: "Employees", value: data?.stats.employees ?? 0, icon: UsersIcon },
        ]}
      />

      <Card className="gap-0 py-0">
        <CardHeader className="gap-4 border-b py-5 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-1">
            <CardTitle>Vacation requests</CardTitle>
            <CardDescription>Time off your team asked for. Decisions are final once saved.</CardDescription>
          </div>
          <SearchInput
            value={search}
            onChange={(value) => updateFilters(() => setSearch(value))}
            placeholder="Search employee…"
            label="Search vacation requests"
          />
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
            <ClearSearchBadge search={search.trim()} onClear={() => updateFilters(() => setSearch(""))} />
            <ResultCount isPending={isPending} isFetching={isFetching} total={data?.total ?? 0} scopeTotal={scopeTotal} />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow className="hover:bg-transparent">
                <TableHead className={`pl-6 ${headClassName}`}>Employee</TableHead>
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
                <SkeletonRows columns={COLUMNS} />
              ) : isError ? (
                <ErrorRow
                  columns={COLUMNS}
                  message="Your team's vacation requests couldn't be loaded."
                  onRetry={() => refetch()}
                />
              ) : requests.length === 0 ? (
                <MessageRow columns={COLUMNS}>
                  {scopeTotal === 0 ? "Your team hasn't requested any vacations yet." : "No vacation requests match your filters."}
                </MessageRow>
              ) : (
                requests.map((request) => {
                  const range = formatVacationRange(request.startDate, request.endDate)
                  return (
                    <TableRow key={request.id} className="hover:bg-primary/5">
                      <TableCell className="pl-6">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{request.employeeName}</span>
                          <span className="text-xs text-muted-foreground">{range}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatDays(request.numberOfDays)}</TableCell>
                      <TableCell>
                        <TimesheetStatusBadge status={request.status} />
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {formatSubmittedAt(request.submittedAt)}
                      </TableCell>
                      <TableCell className="pr-6">
                        {request.status === "pending" && (
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

      <ReviewVacationDialogView
        review={review}
        onOpenChange={(open) => !open && setReview(null)}
        reviewRequest={reviewRequest}
      />
    </div>
  )
}
