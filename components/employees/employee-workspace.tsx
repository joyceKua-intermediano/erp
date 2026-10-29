"use client"

import { useState } from "react"
import Link from "next/link"
import {
  BlocksIcon,
  FileSignatureIcon,
  GlobeIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  UserCheckIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"
import { ClusterSwitcher } from "@/components/cluster-switcher"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TablePager } from "@/components/table-pager"
import { useActiveCluster } from "@/hooks/use-clusters"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useEmployees } from "@/hooks/use-employees"
import { clusterModuleDetails, type ClusterModuleKey } from "@/lib/cluster-modules"
import type { ClusterEmployees } from "@/lib/employees"
import { SEARCH_DEBOUNCE_MS } from "@/lib/pagination"
import { ContractStatusBadge, formatContractDate } from "./contract-status-badge"
import { EmployeeFormSheet } from "./employee-form-sheet"

export function ChooseClusterCard({
  description = "Employee records are scoped to one Intermediano legal entity at a time.",
}: {
  description?: string
}) {
  return (
    <Card className="animate-in fade-in-0 duration-300 [--card-spacing:--spacing(10)]">
      <CardContent className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <GlobeIcon className="size-6" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-lg font-semibold">Choose a cluster to begin</h2>
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        <ClusterSwitcher />
      </CardContent>
    </Card>
  )
}

export function ModuleDisabledCard({ module, clusterLabel }: { module: ClusterModuleKey; clusterLabel: string }) {
  return (
    <Card className="animate-in fade-in-0 duration-300 [--card-spacing:--spacing(10)]">
      <CardContent className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BlocksIcon className="size-6" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-lg font-semibold">
            {clusterModuleDetails[module].label} isn&apos;t enabled for {clusterLabel}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Switch to another cluster, or ask an administrator to turn it on in this company&apos;s module settings.
          </p>
        </div>
        <ClusterSwitcher />
      </CardContent>
    </Card>
  )
}

function EmployeeStats({
  figures,
  isPending,
  clusterLabel,
}: {
  figures: ClusterEmployees["stats"] | undefined
  isPending: boolean
  clusterLabel: string
}) {
  const stats = [
    { label: "Employees", value: figures?.employees ?? 0, icon: UsersIcon },
    { label: "Active contracts", value: figures?.active ?? 0, icon: UserCheckIcon },
    { label: "Pending signature", value: figures?.pendingSignature ?? 0, icon: FileSignatureIcon },
  ]

  return (
    <section className="grid gap-4 sm:grid-cols-3" aria-label={`${clusterLabel} summary`}>
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
  )
}

export function EmployeeSummary() {
  const activeCluster = useActiveCluster()

  if (!activeCluster) return <ChooseClusterCard />
  if (!activeCluster.modules.includes("employees")) {
    return <ModuleDisabledCard module="employees" clusterLabel={activeCluster.label} />
  }

  return <ClusterEmployeeSummary key={activeCluster.id} clusterLabel={activeCluster.label} />
}

function ClusterEmployeeSummary({ clusterLabel }: { clusterLabel: string }) {
  const { data, isPending } = useEmployees({ page: 1, search: "" })

  return <EmployeeStats figures={data?.stats} isPending={isPending} clusterLabel={clusterLabel} />
}

type EmployeeWorkspaceProps = {
  canManage: boolean
}

export function EmployeeWorkspace({ canManage }: EmployeeWorkspaceProps) {
  const activeCluster = useActiveCluster()

  if (!activeCluster) return <ChooseClusterCard />
  if (!activeCluster.modules.includes("employees")) {
    return <ModuleDisabledCard module="employees" clusterLabel={activeCluster.label} />
  }

  return <ClusterEmployeesPanel key={activeCluster.id} clusterLabel={activeCluster.label} canManage={canManage} />
}

function ClusterEmployeesPanel({ clusterLabel, canManage }: { clusterLabel: string; canManage: boolean }) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [sheet, setSheet] = useState({ open: false, key: 0 })
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const { data, isPending, isError, isFetching, refetch } = useEmployees({ page, search: debouncedSearch })

  const visibleEmployees = data?.employees ?? []
  const clusterTotal = data?.stats.employees ?? 0
  const trimmedSearch = search.trim()

  function updateSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      <EmployeeStats figures={data?.stats} isPending={isPending} clusterLabel={clusterLabel} />

      <Card className="gap-0 py-0">
        <CardHeader className="gap-4 border-b py-5 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              Employees
              <Badge variant="outline" className="border-primary/30 text-primary">
                {clusterLabel}
              </Badge>
            </CardTitle>
            <CardDescription>Everyone employed by this legal entity.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => updateSearch(event.target.value)}
                  placeholder="Search name, email, position…"
                  aria-label="Search employees"
                  className="pl-8 focus-visible:border-primary focus-visible:ring-primary/25"
                />
              </div>
              {canManage && (
                <Button onClick={() => setSheet((current) => ({ open: true, key: current.key + 1 }))}>
                  <PlusIcon />
                  Add employee
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/10 text-primary">
                {isPending ? "Loading…" : `${data?.total ?? 0} of ${clusterTotal}`}
              </Badge>
              {trimmedSearch && (
                <Badge
                  render={<button type="button" onClick={() => updateSearch("")} />}
                  className="cursor-pointer gap-1 bg-primary text-primary-foreground hover:bg-primary/85"
                >
                  &ldquo;{trimmedSearch}&rdquo;
                  <XIcon className="size-3" />
                  <span className="sr-only">Clear search</span>
                </Badge>
              )}
              {isFetching && !isPending && (
                <RefreshCwIcon className="size-3.5 animate-spin text-primary" aria-label="Refreshing" />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {isError ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Employees for {clusterLabel} couldn&apos;t be loaded.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCwIcon />
                Try again
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6 text-xs font-semibold tracking-wide text-primary uppercase">
                    Employee
                  </TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-primary uppercase">
                    Position
                  </TableHead>
                  <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase md:table-cell">
                    Client
                  </TableHead>
                  <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase lg:table-cell">
                    Start date
                  </TableHead>
                  <TableHead className="pr-6 text-xs font-semibold tracking-wide text-primary uppercase">
                    Contract status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody key={isPending ? "loading" : "ready"} className="animate-in duration-300 fade-in-0">
                {isPending ? (
                  Array.from({ length: 4 }, (_, index) => (
                    <TableRow key={index}>
                      <TableCell className="pl-6">
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell className="pr-6">
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : visibleEmployees.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                      {clusterTotal === 0
                        ? `No employees in ${clusterLabel} yet.`
                        : "No employees match your search."}
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleEmployees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-primary/5">
                      <TableCell className="pl-6">
                        <Link href={`/admin/employees/${employee.id}`} className="group flex flex-col">
                          <span className="font-medium group-hover:text-primary">{employee.name}</span>
                          <span className="text-xs text-muted-foreground">{employee.email}</span>
                        </Link>
                      </TableCell>
                      <TableCell>{employee.position ?? "—"}</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {employee.clientCompany ?? "—"}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground tabular-nums lg:table-cell">
                        {formatContractDate(employee.contractStart)}
                      </TableCell>
                      <TableCell className="pr-6">
                        <ContractStatusBadge status={employee.contractStatus} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          {data && !isError && (
            <TablePager page={page} total={data.total} onPageChange={setPage} isFetching={isFetching} />
          )}
        </CardContent>
      </Card>

      {canManage && (
        <EmployeeFormSheet
          open={sheet.open}
          employee={null}
          clusterLabel={clusterLabel}
          formKey={sheet.key}
          onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
        />
      )}
    </div>
  )
}
