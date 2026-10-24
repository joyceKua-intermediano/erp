"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArchiveIcon, ArrowLeftIcon, MailIcon, PencilIcon, RefreshCwIcon } from "lucide-react"
import { UserAvatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useActiveCluster } from "@/hooks/use-clusters"
import { useEmployee } from "@/hooks/use-employees"
import type { EmployeeDetail } from "@/lib/employees"
import { ArchiveEmployeeDialog } from "./archive-employee-dialog"
import { ContractStatusBadge, formatContractDate } from "./contract-status-badge"
import { EmployeeFormSheet } from "./employee-form-sheet"
import { ChooseClusterCard } from "./employee-workspace"

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" })

const employeesBackLink = (
  <Link
    href="/admin/employees"
    className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit text-muted-foreground" })}
  >
    <ArrowLeftIcon />
    All employees
  </Link>
)

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 px-6 py-3.5 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

function EmployeeNotFound({ clusterLabel }: { clusterLabel: string }) {
  return (
    <div className="flex flex-col gap-4">
      {employeesBackLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-heading text-lg font-semibold">Employee not found in {clusterLabel}</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            They may have been archived, belong to another cluster, or the link is wrong.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function EmployeeLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {employeesBackLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">This employee couldn&apos;t be loaded.</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCwIcon />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

type EmployeeDetailViewProps = {
  employeeId: string
  canManage: boolean
}

export function EmployeeDetailView({ employeeId, canManage }: EmployeeDetailViewProps) {
  const activeCluster = useActiveCluster()

  if (!activeCluster) return <ChooseClusterCard />

  return (
    <ClusterEmployeeDetail
      key={activeCluster.id}
      employeeId={employeeId}
      clusterLabel={activeCluster.label}
      canManage={canManage}
    />
  )
}

function ClusterEmployeeDetail({
  employeeId,
  clusterLabel,
  canManage,
}: EmployeeDetailViewProps & { clusterLabel: string }) {
  const { data: employee, isPending, isError, refetch } = useEmployee(employeeId)

  if (isPending) return <Skeleton className="h-96 rounded-xl" />
  if (isError) return <EmployeeLoadError onRetry={() => refetch()} />
  if (!employee) return <EmployeeNotFound clusterLabel={clusterLabel} />

  return <EmployeeDetailContent employee={employee} canManage={canManage} />
}

function EmployeeDetailContent({ employee, canManage }: { employee: EmployeeDetail; canManage: boolean }) {
  const router = useRouter()
  const [sheet, setSheet] = useState({ open: false, key: 0 })
  const [isArchiveOpen, setArchiveOpen] = useState(false)

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      {employeesBackLink}

      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar name={employee.name} />
            <div className="flex flex-col gap-1.5">
              <h2 className="font-heading text-xl font-semibold tracking-tight">{employee.name}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/30 text-primary">
                  {employee.clusterLabel}
                </Badge>
                <a
                  href={`mailto:${employee.email}`}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
                >
                  <MailIcon className="size-3.5" />
                  {employee.email}
                </a>
              </div>
            </div>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSheet((current) => ({ open: true, key: current.key + 1 }))}>
                <PencilIcon />
                Edit
              </Button>
              <Button variant="destructive" onClick={() => setArchiveOpen(true)}>
                <ArchiveIcon />
                Archive
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
          <CardTitle>Employee information</CardTitle>
          <CardDescription>Basic record used across contracts, timesheets and payroll.</CardDescription>
        </CardHeader>
        <dl className="divide-y">
          <DetailRow label="Full name">{employee.name}</DetailRow>
          <DetailRow label="Email">{employee.email}</DetailRow>
          <DetailRow label="Consultant">{employee.consultantName ?? "—"}</DetailRow>
          <DetailRow label="Cluster">{employee.clusterLabel}</DetailRow>
          <DetailRow label="Added">
            {employee.createdAt ? dateFormatter.format(new Date(employee.createdAt)) : "—"}
          </DetailRow>
        </dl>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
          <CardTitle>Contracts</CardTitle>
          <CardDescription>Contracts with this employee under {employee.clusterLabel}.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 text-xs font-semibold tracking-wide text-primary uppercase">
                  Position
                </TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase md:table-cell">
                  Client
                </TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase lg:table-cell">
                  Start
                </TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase lg:table-cell">
                  End
                </TableHead>
                <TableHead className="pr-6 text-xs font-semibold tracking-wide text-primary uppercase">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employee.contracts.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No contracts yet.
                  </TableCell>
                </TableRow>
              ) : (
                employee.contracts.map((contract) => (
                  <TableRow key={contract.id} className="hover:bg-primary/5">
                    <TableCell className="pl-6 font-medium">{contract.jobTitle ?? "—"}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {contract.clientCompany ?? "—"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground tabular-nums lg:table-cell">
                      {formatContractDate(contract.startDate)}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground tabular-nums lg:table-cell">
                      {formatContractDate(contract.endDate)}
                    </TableCell>
                    <TableCell className="pr-6">
                      <ContractStatusBadge status={contract.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canManage && (
        <>
          <EmployeeFormSheet
            open={sheet.open}
            employee={employee}
            clusterLabel={employee.clusterLabel}
            formKey={sheet.key}
            onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
          />
          <ArchiveEmployeeDialog
            open={isArchiveOpen}
            employee={employee}
            onOpenChange={setArchiveOpen}
            onArchived={() => router.push("/admin/employees")}
          />
        </>
      )}
    </div>
  )
}
