"use client"

import { useState } from "react"
import {
  CalendarIcon,
  DownloadIcon,
  ReceiptIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"
import { ChooseClusterCard, ModuleDisabledCard } from "@/components/employees/employee-workspace"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePager } from "@/components/table-pager"
import { useActiveCluster } from "@/hooks/use-clusters"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { payslipFileUrl, usePayslips } from "@/hooks/use-payslips"
import { SEARCH_DEBOUNCE_MS } from "@/lib/pagination"
import type { PayslipItem } from "@/lib/payslips"
import { DeletePayslipDialog } from "./delete-payslip-dialog"
import { UploadPayslipDialog } from "./upload-payslip-dialog"
import type { RecordPermissions } from "@/lib/permissions"

const headClassName = "text-xs font-semibold tracking-wide text-primary uppercase"

function formatUploadedAt(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value))
}

export function PayslipWorkspace({ can, canDownload }: { can: RecordPermissions; canDownload: boolean }) {
  const activeCluster = useActiveCluster()

  if (!activeCluster) {
    return <ChooseClusterCard description="Payslips are scoped to one Intermediano legal entity at a time." />
  }
  if (!activeCluster.modules.includes("payslips")) {
    return <ModuleDisabledCard module="payslips" clusterLabel={activeCluster.label} />
  }

  return (
    <ClusterPayslipPanel
      key={activeCluster.id}
      clusterId={activeCluster.id}
      clusterLabel={activeCluster.label}
      can={can}
      canDownload={canDownload}
    />
  )
}

function ClusterPayslipPanel({
  clusterId,
  clusterLabel,
  can,
  canDownload,
}: {
  clusterId: string
  clusterLabel: string
  can: RecordPermissions
  canDownload: boolean
}) {
  const [search, setSearch] = useState("")
  const [period, setPeriod] = useState("")
  const [page, setPage] = useState(1)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadKey, setUploadKey] = useState(0)
  const [deleting, setDeleting] = useState<PayslipItem | null>(null)
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const periodFilter = /^\d{4}-\d{2}$/.test(period) ? period : null
  const { data, isPending, isError, isFetching, refetch } = usePayslips({
    page,
    search: debouncedSearch,
    period: periodFilter,
  })

  const payslips = data?.payslips ?? []
  const clusterTotal = data?.stats.payslips ?? 0
  const trimmedSearch = search.trim()
  const hasActions = canDownload || can.delete
  const columnCount = hasActions ? 5 : 4

  // Any change to the filters starts again from the first page.
  function updateFilters(apply: () => void) {
    apply()
    setPage(1)
  }

  function openUpload() {
    setUploadKey((key) => key + 1)
    setIsUploadOpen(true)
  }

  const stats = [
    { label: "Payslips", value: String(clusterTotal), icon: ReceiptIcon },
    { label: "Employees with payslips", value: String(data?.stats.employees ?? 0), icon: UsersIcon },
    { label: "Latest period", value: data?.stats.latestPeriod ?? "—", icon: CalendarIcon },
  ]

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      <section className="grid gap-4 sm:grid-cols-3" aria-label={`${clusterLabel} payslip summary`}>
        {stats.map((stat) => (
          <Card key={stat.label} className="[--card-spacing:--spacing(5)]">
            <CardContent className="flex items-center gap-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <stat.icon className="size-5" />
              </span>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                {isPending ? (
                  <Skeleton className="mt-1 h-6 w-16" />
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
              Payslips
              <Badge variant="outline" className="border-primary/30 text-primary">
                {clusterLabel}
              </Badge>
            </CardTitle>
            <CardDescription>Uploaded payslips, newest period first.</CardDescription>
          </div>
          {can.create && (
            <Button onClick={openUpload}>
              <UploadIcon />
              Upload payslip
            </Button>
          )}
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <div className="relative w-full sm:w-72">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => updateFilters(() => setSearch(event.target.value))}
                placeholder="Search employee or file name…"
                aria-label="Search payslips"
                className="pl-8 focus-visible:border-primary focus-visible:ring-primary/25"
              />
            </div>
            <Input
              type="month"
              value={period}
              onChange={(event) => updateFilters(() => setPeriod(event.target.value))}
              aria-label="Filter by period"
              className="w-full sm:w-44"
            />
            {(trimmedSearch || period) && (
              <Badge
                render={
                  <button
                    type="button"
                    onClick={() =>
                      updateFilters(() => {
                        setSearch("")
                        setPeriod("")
                      })
                    }
                  />
                }
                variant="outline"
                className="cursor-pointer gap-1"
              >
                Clear filters
                <XIcon className="size-3" />
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
                <TableHead className={headClassName}>Period</TableHead>
                <TableHead className={`hidden md:table-cell ${headClassName}`}>File</TableHead>
                <TableHead className={`hidden lg:table-cell ${headClassName}`}>Uploaded</TableHead>
                {hasActions && <TableHead className={`pr-6 text-right ${headClassName}`}>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody key={isPending ? "loading" : "ready"} className="animate-in duration-300 fade-in-0">
              {isPending ? (
                Array.from({ length: 4 }, (_, index) => (
                  <TableRow key={index}>
                    <TableCell className="pl-6">
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    {hasActions && (
                      <TableCell className="pr-6">
                        <Skeleton className="ml-auto h-7 w-16" />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columnCount} className="py-12">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="text-sm text-muted-foreground">Payslips for {clusterLabel} couldn&apos;t be loaded.</p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCwIcon />
                        Try again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : payslips.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columnCount} className="py-12 text-center text-sm text-muted-foreground">
                    {clusterTotal === 0 ? `No payslips in ${clusterLabel} yet.` : "No payslips match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                payslips.map((payslip) => (
                  <TableRow key={payslip.id} className="hover:bg-primary/5">
                    <TableCell className="pl-6 font-medium">{payslip.employeeName}</TableCell>
                    <TableCell>{payslip.periodLabel}</TableCell>
                    <TableCell className="hidden max-w-64 md:table-cell">
                      <a
                        href={payslipFileUrl(clusterId, payslip.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1.5 truncate hover:text-primary"
                      >
                        <DownloadIcon className="size-3.5 shrink-0" />
                        <span className="truncate">{payslip.fileName}</span>
                      </a>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {formatUploadedAt(payslip.uploadedAt)}
                    </TableCell>
                    {hasActions && (
                      <TableCell className="pr-6">
                        <div className="flex justify-end gap-1">
                          {canDownload && (
                            <a
                              href={payslipFileUrl(clusterId, payslip.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                              aria-label={`Open ${payslip.fileName}`}
                            >
                              <DownloadIcon />
                            </a>
                          )}
                          {can.delete && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeleting(payslip)}
                              aria-label={`Delete ${payslip.employeeName}'s ${payslip.periodLabel} payslip`}
                            >
                              <Trash2Icon />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {data && <TablePager page={page} total={data.total} onPageChange={setPage} isFetching={isFetching} />}
        </CardContent>
      </Card>

      {can.create && <UploadPayslipDialog key={uploadKey} open={isUploadOpen} onOpenChange={setIsUploadOpen} />}
      {can.delete && <DeletePayslipDialog payslip={deleting} onOpenChange={(open) => !open && setDeleting(null)} />}
    </div>
  )
}
