"use client"

import { useState } from "react"
import {
  FileSignatureIcon,
  GlobeIcon,
  RefreshCwIcon,
  SearchIcon,
  UserCheckIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"
import { cn } from "cn"
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
import { useEmployees } from "@/hooks/use-employees"
import { getCluster } from "@/lib/clusters"
import { contractStatusLabels, type ClusterEmployee, type ContractStatus } from "@/lib/employees"
import { useUiStore } from "@/store/use-ui-store"

const statusBadgeClasses: Record<ContractStatus, string> = {
  active: "border-transparent bg-primary text-primary-foreground",
  pending_signature: "border-primary/40 bg-primary/5 text-primary",
  upcoming: "border-transparent bg-secondary text-secondary-foreground",
  ended: "border-border text-muted-foreground",
  none: "border-dashed border-border text-muted-foreground",
}

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" })

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(`${value}T00:00:00Z`)) : "—"
}

function matchesSearch(employee: ClusterEmployee, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [employee.name, employee.email, employee.position, employee.clientCompany]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(needle))
}

export function EmployeeWorkspace() {
  const activeCluster = useUiStore((state) => state.activeCluster)

  if (!activeCluster) {
    return (
      <Card className="animate-in fade-in-0 duration-300 [--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <GlobeIcon className="size-6" />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-lg font-semibold">Choose a cluster to begin</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Employee records are scoped to one Intermediano legal entity at a time.
            </p>
          </div>
          <ClusterSwitcher />
        </CardContent>
      </Card>
    )
  }

  return <ClusterEmployeesPanel key={activeCluster} clusterLabel={getCluster(activeCluster).label} />
}

function ClusterEmployeesPanel({ clusterLabel }: { clusterLabel: string }) {
  const [search, setSearch] = useState("")
  const { data, isPending, isError, isFetching, refetch } = useEmployees()

  const employees = data ?? []
  const visibleEmployees = employees.filter((employee) => matchesSearch(employee, search))
  const activeCount = employees.filter((employee) => employee.contractStatus === "active").length
  const pendingCount = employees.filter((employee) => employee.contractStatus === "pending_signature").length
  const trimmedSearch = search.trim()

  const stats = [
    { label: "Employees", value: employees.length, icon: UsersIcon },
    { label: "Active contracts", value: activeCount, icon: UserCheckIcon },
    { label: "Pending signature", value: pendingCount, icon: FileSignatureIcon },
  ]

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
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

      <Card className="gap-0 py-0">
        <CardHeader className="gap-4 border-b py-5 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              Employees
              <Badge variant="outline" className="border-primary/30 text-primary">
                {clusterLabel}
              </Badge>
            </CardTitle>
            <CardDescription>Everyone with a contract under this legal entity.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="relative w-full sm:w-72">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, position…"
                aria-label="Search employees"
                className="pl-8 focus-visible:border-primary focus-visible:ring-primary/25"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/10 text-primary">
                {isPending ? "Loading…" : `${visibleEmployees.length} of ${employees.length}`}
              </Badge>
              {trimmedSearch && (
                <Badge
                  render={<button type="button" onClick={() => setSearch("")} />}
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
                      {employees.length === 0
                        ? `No employees have contracts under ${clusterLabel} yet.`
                        : "No employees match your search."}
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleEmployees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-primary/5">
                      <TableCell className="pl-6">
                        <div className="flex flex-col">
                          <span className="font-medium">{employee.name}</span>
                          <span className="text-xs text-muted-foreground">{employee.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{employee.position ?? "—"}</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {employee.clientCompany ?? "—"}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground tabular-nums lg:table-cell">
                        {formatDate(employee.contractStart)}
                      </TableCell>
                      <TableCell className="pr-6">
                        <Badge variant="outline" className={cn(statusBadgeClasses[employee.contractStatus])}>
                          {contractStatusLabels[employee.contractStatus]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
