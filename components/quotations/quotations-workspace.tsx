"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArchiveIcon,
  BuildingIcon,
  CalendarIcon,
  EyeIcon,
  FileTextIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { cn } from "cn"
import { ChooseClusterCard } from "@/components/employees/employee-workspace"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useActiveCluster } from "@/hooks/use-clusters"
import { useQuotations } from "@/hooks/use-quotations"
import {
  formatAmount,
  formatQuotationTitle,
  quotationDateFromTitle,
  type QuotationListItem,
} from "@/lib/quotations"
import { ArchiveQuotationDialog } from "./archive-quotation-dialog"
import { QuotationFormSheet } from "./quotation-form-sheet"

const CHOOSE_CLUSTER_DESCRIPTION = "Quotations are scoped to one Intermediano legal entity at a time."

function matchesSearch(quotation: QuotationListItem, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [quotation.companyName, quotation.title, quotation.provinceName]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(needle))
}

function matchesMonth(quotation: QuotationListItem, month: string) {
  if (!month) return true
  return quotationDateFromTitle(quotation.title)?.startsWith(month) ?? false
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

export function QuotationTotal({ quotation }: { quotation: QuotationListItem }) {
  if (quotation.totalInvoice === null) return <span className="text-muted-foreground">—</span>
  const rate = Number(quotation.exchangeRate)
  return (
    <span className="flex flex-col items-end tabular-nums">
      <span className="font-medium">
        {quotation.currencyName} {formatAmount(quotation.totalInvoice)}
      </span>
      {rate > 0 && (
        <span className="text-xs text-muted-foreground">
          {quotation.billingCurrency} {formatAmount(quotation.totalInvoice / rate)}
        </span>
      )}
    </span>
  )
}

type QuotationsWorkspaceProps = {
  canManage: boolean
}

export function QuotationsWorkspace({ canManage }: QuotationsWorkspaceProps) {
  const activeCluster = useActiveCluster()

  if (!activeCluster) return <ChooseClusterCard description={CHOOSE_CLUSTER_DESCRIPTION} />

  return <ClusterQuotationsPanel key={activeCluster.id} clusterLabel={activeCluster.label} canManage={canManage} />
}

function ClusterQuotationsPanel({ clusterLabel, canManage }: { clusterLabel: string; canManage: boolean }) {
  const [search, setSearch] = useState("")
  const [month, setMonth] = useState("")
  const [variantFilter, setVariantFilter] = useState<string | null>(null)
  const [sheet, setSheet] = useState({ open: false, key: 0 })
  const [archive, setArchive] = useState<{ open: boolean; quotation: QuotationListItem | null }>({
    open: false,
    quotation: null,
  })
  const { data, isPending, isError, isFetching, refetch } = useQuotations()

  const quotations = data?.quotations ?? []
  const isPorted = data?.kind != null
  const variants = [...new Set(quotations.map((quotation) => quotation.variant).filter((value) => value !== null))]
  const visibleQuotations = quotations.filter(
    (quotation) =>
      matchesSearch(quotation, search) &&
      matchesMonth(quotation, month) &&
      (variantFilter === null || quotation.variant === variantFilter)
  )
  const trimmedSearch = search.trim()
  const thisMonth = currentMonth()

  const stats = [
    { label: "Quotations", value: quotations.length, icon: FileTextIcon },
    {
      label: "This month",
      value: quotations.filter((quotation) => matchesMonth(quotation, thisMonth)).length,
      icon: CalendarIcon,
    },
    {
      label: "Customers quoted",
      value: new Set(quotations.map((quotation) => quotation.companyName)).size,
      icon: BuildingIcon,
    },
  ]

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      <section className="grid gap-4 sm:grid-cols-3" aria-label={`${clusterLabel} quotations summary`}>
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
          Quotation forms and cost breakdowns for {clusterLabel} haven&apos;t been ported yet. Existing quotations are
          listed, but use the legacy app to add or price them.
        </p>
      )}

      <Card className="gap-0 py-0">
        <CardHeader className="gap-4 border-b py-5 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              Quotations
              <Badge variant="outline" className="border-primary/30 text-primary">
                {clusterLabel}
              </Badge>
            </CardTitle>
            <CardDescription>Monthly payroll cost quotes prepared for customers under this legal entity.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customer or title…"
                aria-label="Search quotations"
                className="pl-8 focus-visible:border-primary focus-visible:ring-primary/25"
              />
            </div>
            {canManage && isPorted && (
              <Button onClick={() => setSheet((current) => ({ open: true, key: current.key + 1 }))}>
                <PlusIcon />
                Add quotation
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
              {isPending ? "Loading…" : `${visibleQuotations.length} of ${quotations.length}`}
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
                <TableHead className="pl-6 text-xs font-semibold tracking-wide text-primary uppercase">Quotation</TableHead>
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
                      <p className="text-sm text-muted-foreground">Quotations for {clusterLabel} couldn&apos;t be loaded.</p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCwIcon />
                        Try again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : visibleQuotations.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    {quotations.length === 0 ? `No quotations in ${clusterLabel} yet.` : "No quotations match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                visibleQuotations.map((quotation) => {
                  const href = `/admin/quotations/${quotation.id}`
                  const title = formatQuotationTitle(quotation.title)
                  return (
                    <TableRow key={quotation.id} className="hover:bg-primary/5">
                      <TableCell className="pl-6">
                        <Link href={href} className="group flex flex-col gap-1">
                          <span className="flex items-center gap-2">
                            <span className="font-medium group-hover:text-primary">{title}</span>
                            {quotation.variant && (
                              <Badge variant="outline" className="border-primary/30 text-primary">
                                {quotation.variant}
                              </Badge>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground md:hidden">{quotation.companyName}</span>
                          <span className="hidden text-xs text-muted-foreground md:inline">
                            {[quotation.countryName, quotation.provinceName].filter(Boolean).join(" · ")}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{quotation.companyName}</TableCell>
                      <TableCell className="hidden text-right text-muted-foreground tabular-nums lg:table-cell">
                        {quotation.currencyName} {formatAmount(Number(quotation.grossSalary))}
                      </TableCell>
                      <TableCell className="text-right">
                        <QuotationTotal quotation={quotation} />
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-sm" aria-label={`Actions for the ${title} quotation`}>
                                <MoreHorizontalIcon />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem render={<Link href={href} />}>
                              <EyeIcon />
                              View breakdown
                            </DropdownMenuItem>
                            {canManage && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setArchive({ open: true, quotation })}
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
            <QuotationFormSheet
              open={sheet.open}
              quotation={null}
              clusterLabel={clusterLabel}
              formKey={sheet.key}
              onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
            />
          )}
          <ArchiveQuotationDialog
            open={archive.open}
            quotation={archive.quotation}
            onOpenChange={(open) => setArchive((current) => ({ ...current, open }))}
          />
        </>
      )}
    </div>
  )
}
