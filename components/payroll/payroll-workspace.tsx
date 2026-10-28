"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArchiveIcon,
  CalendarIcon,
  CoinsIcon,
  EyeIcon,
  MoreHorizontalIcon,
  PlusIcon,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useActiveCluster } from "@/hooks/use-clusters"
import { usePayrolls } from "@/hooks/use-payroll"
import type { PayrollListItem } from "@/lib/payroll"
import { formatAmount, formatQuotationTitle, quotationDateFromTitle } from "@/lib/quotations"
import { ArchivePayrollDialog } from "./archive-payroll-dialog"
import { PayrollFormSheet } from "./payroll-form-sheet"

const CHOOSE_CLUSTER_DESCRIPTION = "Payroll is scoped to one Intermediano legal entity at a time."

const ALL_CONSULTANTS = "all"

function matchesSearch(payroll: PayrollListItem, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [payroll.consultantName, payroll.companyName, payroll.title]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(needle))
}

function matchesMonth(payroll: PayrollListItem, month: string) {
  if (!month) return true
  return quotationDateFromTitle(payroll.title)?.startsWith(month) ?? false
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
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

function PayrollTotal({ payroll }: { payroll: PayrollListItem }) {
  if (payroll.totalInvoice === null) return <span className="text-muted-foreground">—</span>
  return (
    <span className="font-medium tabular-nums">
      {payroll.currencyName} {formatAmount(payroll.totalInvoice)}
    </span>
  )
}

type PayrollWorkspaceProps = {
  canManage: boolean
}

export function PayrollWorkspace({ canManage }: PayrollWorkspaceProps) {
  const activeCluster = useActiveCluster()

  if (!activeCluster) return <ChooseClusterCard description={CHOOSE_CLUSTER_DESCRIPTION} />
  if (!activeCluster.modules.includes("payroll")) {
    return <ModuleDisabledCard module="payroll" clusterLabel={activeCluster.label} />
  }

  return <ClusterPayrollPanel key={activeCluster.id} clusterLabel={activeCluster.label} canManage={canManage} />
}

function ClusterPayrollPanel({ clusterLabel, canManage }: { clusterLabel: string; canManage: boolean }) {
  const [search, setSearch] = useState("")
  const [month, setMonth] = useState("")
  const [consultantFilter, setConsultantFilter] = useState(ALL_CONSULTANTS)
  const [variantFilter, setVariantFilter] = useState<string | null>(null)
  const [sheet, setSheet] = useState({ open: false, key: 0 })
  const [archive, setArchive] = useState<{ open: boolean; payroll: PayrollListItem | null }>({
    open: false,
    payroll: null,
  })
  const { data, isPending, isError, isFetching, refetch } = usePayrolls()

  const payrolls = data?.payrolls ?? []
  const isPorted = data?.kind != null
  const variants = [...new Set(payrolls.map((payroll) => payroll.variant).filter((value) => value !== null))]
  const consultants = [
    ...new Map(
      payrolls.flatMap((payroll) =>
        payroll.consultantId && payroll.consultantName ? [[payroll.consultantId, payroll.consultantName] as const] : []
      )
    ),
  ].sort(([, a], [, b]) => a.localeCompare(b))
  const consultantItems = [
    { label: "All consultants", value: ALL_CONSULTANTS },
    ...consultants.map(([id, name]) => ({ label: name, value: id })),
  ]
  const visiblePayrolls = payrolls.filter(
    (payroll) =>
      matchesSearch(payroll, search) &&
      matchesMonth(payroll, month) &&
      (consultantFilter === ALL_CONSULTANTS || payroll.consultantId === consultantFilter) &&
      (variantFilter === null || payroll.variant === variantFilter)
  )
  const trimmedSearch = search.trim()
  const thisMonth = currentMonth()

  const stats = [
    { label: "Payroll runs", value: payrolls.length, icon: CoinsIcon },
    {
      label: "This month",
      value: payrolls.filter((payroll) => matchesMonth(payroll, thisMonth)).length,
      icon: CalendarIcon,
    },
    { label: "Consultants", value: consultants.length, icon: UsersIcon },
  ]

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      <section className="grid gap-4 sm:grid-cols-3" aria-label={`${clusterLabel} payroll summary`}>
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

      {data && !isPorted && (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Payroll forms and cost breakdowns for {clusterLabel} haven&apos;t been ported yet. Existing payroll runs are
          listed, but use the legacy app to add or price them.
        </p>
      )}

      <Card className="gap-0 py-0">
        <CardHeader className="gap-4 border-b py-5 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              Payroll
              <Badge variant="outline" className="border-primary/30 text-primary">
                {clusterLabel}
              </Badge>
            </CardTitle>
            <CardDescription>Monthly payroll runs billed for each consultant under this legal entity.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search consultant or customer…"
                aria-label="Search payroll"
                className="pl-8 focus-visible:border-primary focus-visible:ring-primary/25"
              />
            </div>
            {canManage && isPorted && (
              <Button onClick={() => setSheet((current) => ({ open: true, key: current.key + 1 }))}>
                <PlusIcon />
                Add payroll
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <Input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              aria-label="Filter by month"
              className="h-7 w-40 text-xs focus-visible:border-primary focus-visible:ring-primary/25"
            />
            {consultants.length > 1 && (
              <Select
                value={consultantFilter}
                onValueChange={(next) => setConsultantFilter((next as string | null) ?? ALL_CONSULTANTS)}
                items={consultantItems}
              >
                <SelectTrigger size="sm" className="h-7 w-48 text-xs" aria-label="Filter by consultant">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {consultantItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {variants.length > 1 && (
              <>
                <FilterBadge isActive={variantFilter === null} onClick={() => setVariantFilter(null)}>
                  All types
                </FilterBadge>
                {variants.map((variant) => (
                  <FilterBadge key={variant} isActive={variantFilter === variant} onClick={() => setVariantFilter(variant)}>
                    {variant}
                  </FilterBadge>
                ))}
              </>
            )}
            {trimmedSearch && (
              <Badge
                render={<button type="button" onClick={() => setSearch("")} />}
                variant="outline"
                className="cursor-pointer gap-1"
              >
                &ldquo;{trimmedSearch}&rdquo;
                <XIcon className="size-3" />
                <span className="sr-only">Clear search</span>
              </Badge>
            )}
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {isPending ? "Loading…" : `${visiblePayrolls.length} of ${payrolls.length}`}
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
                <TableHead className="pl-6 text-xs font-semibold tracking-wide text-primary uppercase">Payroll</TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase md:table-cell">
                  Customer
                </TableHead>
                <TableHead className="hidden text-right text-xs font-semibold tracking-wide text-primary uppercase lg:table-cell">
                  Gross salary
                </TableHead>
                <TableHead className="text-right text-xs font-semibold tracking-wide text-primary uppercase">
                  Total invoice
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
                    <TableCell className="hidden lg:table-cell">
                      <Skeleton className="ml-auto h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-4 w-28" />
                    </TableCell>
                    <TableCell className="pr-6" />
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-12">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="text-sm text-muted-foreground">Payroll for {clusterLabel} couldn&apos;t be loaded.</p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCwIcon />
                        Try again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : visiblePayrolls.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    {payrolls.length === 0 ? `No payroll runs in ${clusterLabel} yet.` : "No payroll runs match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                visiblePayrolls.map((payroll) => {
                  const href = `/admin/payroll/${payroll.id}`
                  const title = formatQuotationTitle(payroll.title)
                  const consultant = payroll.consultantName ?? "No consultant"
                  return (
                    <TableRow key={payroll.id} className="hover:bg-primary/5">
                      <TableCell className="pl-6">
                        <Link href={href} className="group flex flex-col gap-1">
                          <span className="flex items-center gap-2">
                            <span className="font-medium group-hover:text-primary">{consultant}</span>
                            {payroll.variant && (
                              <Badge variant="outline" className="border-primary/30 text-primary">
                                {payroll.variant}
                              </Badge>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {title}
                            <span className="md:hidden"> · {payroll.companyName}</span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{payroll.companyName}</TableCell>
                      <TableCell className="hidden text-right text-muted-foreground tabular-nums lg:table-cell">
                        {payroll.currencyName} {formatAmount(Number(payroll.grossSalary))}
                      </TableCell>
                      <TableCell className="text-right">
                        <PayrollTotal payroll={payroll} />
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-sm" aria-label={`Actions for the ${title} payroll of ${consultant}`}>
                                <MoreHorizontalIcon />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem render={<Link href={href} />}>
                              <EyeIcon />
                              View payroll
                            </DropdownMenuItem>
                            {canManage && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setArchive({ open: true, payroll })}
                                >
                                  <ArchiveIcon />
                                  Archive
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canManage && (
        <>
          {isPorted && (
            <PayrollFormSheet
              open={sheet.open}
              payroll={null}
              clusterLabel={clusterLabel}
              formKey={sheet.key}
              onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
            />
          )}
          <ArchivePayrollDialog
            open={archive.open}
            payroll={archive.payroll}
            onOpenChange={(open) => setArchive((current) => ({ ...current, open }))}
          />
        </>
      )}
    </div>
  )
}
