"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArchiveIcon,
  EyeIcon,
  FileSignatureIcon,
  FileTextIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  UserCheckIcon,
  XIcon,
} from "lucide-react"
import { cn } from "cn"
import { ChooseClusterCard, ModuleDisabledCard } from "@/components/employees/employee-workspace"
import { ContractStatusBadge, formatContractDate } from "@/components/employees/contract-status-badge"
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
import { TablePager } from "@/components/table-pager"
import { useActiveCluster } from "@/hooks/use-clusters"
import { useContracts } from "@/hooks/use-contracts"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import {
  contractKindLabels,
  contractKinds,
  type ClusterContract,
  type ContractKind,
  type ContractPeriodFilter,
} from "@/lib/contracts"
import { SEARCH_DEBOUNCE_MS } from "@/lib/pagination"
import { ArchiveContractDialog } from "./archive-contract-dialog"
import { ContractKindBadge, SignatureBadges } from "./contract-badges"
import { ContractFormSheet } from "./contract-form-sheet"

type PeriodFilter = ContractPeriodFilter

const periodFilters: { id: PeriodFilter; name: string }[] = [
  { id: "all", name: "Any period" },
  { id: "fixed", name: "Fixed term" },
  { id: "open", name: "Open-ended" },
]

const CHOOSE_CLUSTER_DESCRIPTION = "Contracts are scoped to one Intermediano legal entity at a time."

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

type ContractsWorkspaceProps = {
  canManage: boolean
}

export function ContractsWorkspace({ canManage }: ContractsWorkspaceProps) {
  const activeCluster = useActiveCluster()

  if (!activeCluster) return <ChooseClusterCard description={CHOOSE_CLUSTER_DESCRIPTION} />
  if (!activeCluster.modules.includes("contracts")) {
    return <ModuleDisabledCard module="contracts" clusterLabel={activeCluster.label} />
  }

  return <ClusterContractsPanel key={activeCluster.id} clusterLabel={activeCluster.label} canManage={canManage} />
}

function ClusterContractsPanel({ clusterLabel, canManage }: { clusterLabel: string; canManage: boolean }) {
  const [search, setSearch] = useState("")
  const [kindFilter, setKindFilter] = useState<ContractKind | null>(null)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all")
  const [sheet, setSheet] = useState({ open: false, key: 0 })
  const [archive, setArchive] = useState<{ open: boolean; contract: ClusterContract | null }>({
    open: false,
    contract: null,
  })
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const { data, isPending, isError, isFetching, refetch } = useContracts({
    page,
    search: debouncedSearch,
    kind: kindFilter,
    period: periodFilter,
  })

  const visibleContracts = data?.contracts ?? []
  const clusterTotal = data?.stats.contracts ?? 0
  const trimmedSearch = search.trim()

  // Any change to the filters starts again from the first page.
  function updateFilters(apply: () => void) {
    apply()
    setPage(1)
  }

  const stats = [
    { label: "Contracts", value: clusterTotal, icon: FileTextIcon },
    { label: "Active", value: data?.stats.active ?? 0, icon: UserCheckIcon },
    { label: "Pending signature", value: data?.stats.pendingSignature ?? 0, icon: FileSignatureIcon },
  ]

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      <section className="grid gap-4 sm:grid-cols-3" aria-label={`${clusterLabel} contracts summary`}>
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
              Contracts
              <Badge variant="outline" className="border-primary/30 text-primary">
                {clusterLabel}
              </Badge>
            </CardTitle>
            <CardDescription>Employee, customer and partner contracts under this legal entity.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => updateFilters(() => setSearch(event.target.value))}
                placeholder="Search employee, position, client…"
                aria-label="Search contracts"
                className="pl-8 focus-visible:border-primary focus-visible:ring-primary/25"
              />
            </div>
            {canManage && (
              <Button onClick={() => setSheet((current) => ({ open: true, key: current.key + 1 }))}>
                <PlusIcon />
                Add contract
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <FilterBadge isActive={kindFilter === null} onClick={() => updateFilters(() => setKindFilter(null))}>
              All kinds
            </FilterBadge>
            {contractKinds.map((kind) => (
              <FilterBadge
                key={kind}
                isActive={kindFilter === kind}
                onClick={() => updateFilters(() => setKindFilter(kind))}
              >
                {contractKindLabels[kind]}
              </FilterBadge>
            ))}
            <span className="mx-1 h-4 w-px bg-border" aria-hidden />
            {periodFilters.map((filter) => (
              <FilterBadge
                key={filter.id}
                isActive={periodFilter === filter.id}
                onClick={() => updateFilters(() => setPeriodFilter(filter.id))}
              >
                {filter.name}
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
                  Client / partner
                </TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase lg:table-cell">
                  Period
                </TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase xl:table-cell">
                  Signatures
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wide text-primary uppercase">Status</TableHead>
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
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <Skeleton className="h-5 w-36 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </TableCell>
                    <TableCell className="pr-6" />
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-12">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="text-sm text-muted-foreground">Contracts for {clusterLabel} couldn&apos;t be loaded.</p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCwIcon />
                        Try again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : visibleContracts.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    {clusterTotal === 0 ? `No contracts in ${clusterLabel} yet.` : "No contracts match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                visibleContracts.map((contract) => {
                  const href = `/admin/contracts/${contract.id}`
                  return (
                    <TableRow key={contract.id} className="hover:bg-primary/5">
                      <TableCell className="pl-6">
                        <Link href={href} className="group flex flex-col gap-1">
                          <span className="flex items-center gap-2">
                            <span className="font-medium group-hover:text-primary">{contract.employeeName}</span>
                            <ContractKindBadge kind={contract.kind} />
                          </span>
                          <span className="text-xs text-muted-foreground">{contract.jobTitle ?? "No job title"}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {contract.counterparty ?? "—"}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground tabular-nums lg:table-cell">
                        {formatContractDate(contract.startDate)} –{" "}
                        {contract.endDate ? formatContractDate(contract.endDate) : "open-ended"}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <SignatureBadges
                          kind={contract.kind}
                          employeeSigned={contract.employeeSigned}
                          adminSigned={contract.adminSigned}
                        />
                      </TableCell>
                      <TableCell>
                        <ContractStatusBadge status={contract.status} />
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions for ${contract.employeeName}'s contract`}
                              >
                                <MoreHorizontalIcon />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem render={<Link href={href} />}>
                              <EyeIcon />
                              View details
                            </DropdownMenuItem>
                            {canManage && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setArchive({ open: true, contract })}
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
          {data && <TablePager page={page} total={data.total} onPageChange={setPage} isFetching={isFetching} />}
        </CardContent>
      </Card>

      {canManage && (
        <>
          <ContractFormSheet
            open={sheet.open}
            contract={null}
            clusterLabel={clusterLabel}
            formKey={sheet.key}
            onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
          />
          <ArchiveContractDialog
            open={archive.open}
            contract={archive.contract}
            onOpenChange={(open) => setArchive((current) => ({ ...current, open }))}
          />
        </>
      )}
    </div>
  )
}
