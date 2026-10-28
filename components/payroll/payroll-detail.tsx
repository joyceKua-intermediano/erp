"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArchiveIcon, ArrowLeftIcon, PencilIcon, RefreshCwIcon } from "lucide-react"
import { cn } from "cn"
import { ChooseClusterCard, ModuleDisabledCard } from "@/components/employees/employee-workspace"
import { BreakdownCard, quotationInputRows } from "@/components/quotations/quotation-detail"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useActiveCluster } from "@/hooks/use-clusters"
import { usePayroll } from "@/hooks/use-payroll"
import type { PayrollDetail, ProvisionLedger, ProvisionLedgerFigures } from "@/lib/payroll"
import { formatAmount, formatQuotationTitle } from "@/lib/quotations"
import { ArchivePayrollDialog } from "./archive-payroll-dialog"
import { PayrollFormSheet } from "./payroll-form-sheet"

const payrollBackLink = (
  <Link
    href="/admin/payroll"
    className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit text-muted-foreground" })}
  >
    <ArrowLeftIcon />
    All payroll
  </Link>
)

function PayrollNotFound({ clusterLabel }: { clusterLabel: string }) {
  return (
    <div className="flex flex-col gap-4">
      {payrollBackLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-heading text-lg font-semibold">Payroll not found in {clusterLabel}</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            It may have been archived, belong to another cluster, or the link is wrong.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function PayrollLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {payrollBackLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">This payroll couldn&apos;t be loaded.</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCwIcon />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

type PayrollDetailViewProps = {
  payrollId: string
  canManage: boolean
}

export function PayrollDetailView({ payrollId, canManage }: PayrollDetailViewProps) {
  const activeCluster = useActiveCluster()

  if (!activeCluster) {
    return <ChooseClusterCard description="Payroll is scoped to one Intermediano legal entity at a time." />
  }
  if (!activeCluster.modules.includes("payroll")) {
    return <ModuleDisabledCard module="payroll" clusterLabel={activeCluster.label} />
  }

  return (
    <ClusterPayrollDetail
      key={activeCluster.id}
      payrollId={payrollId}
      clusterLabel={activeCluster.label}
      canManage={canManage}
    />
  )
}

function ClusterPayrollDetail({
  payrollId,
  clusterLabel,
  canManage,
}: PayrollDetailViewProps & { clusterLabel: string }) {
  const { data: payroll, isPending, isError, refetch } = usePayroll(payrollId)

  if (isPending) return <Skeleton className="h-96 rounded-xl" />
  if (isError) return <PayrollLoadError onRetry={() => refetch()} />
  if (!payroll) return <PayrollNotFound clusterLabel={clusterLabel} />

  return <PayrollDetailContent payroll={payroll} canManage={canManage} />
}

const ledgerColumns: { key: keyof ProvisionLedgerFigures; label: string }[] = [
  { key: "accrued", label: "Accrued" },
  { key: "previousPaid", label: "Paid earlier" },
  { key: "accumulated", label: "Accumulated" },
  { key: "currentPaid", label: "Paid this run" },
  { key: "balance", label: "Balance" },
]

function ProvisionLedgerCard({ ledger, currencyName }: { ledger: ProvisionLedger; currencyName: string }) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
        <CardTitle>Provisions ledger</CardTitle>
        <CardDescription>
          {ledger.previousRuns === 0
            ? "This is the consultant's first payroll run in this cluster."
            : `Accrued over this run and ${ledger.previousRuns} earlier ${ledger.previousRuns === 1 ? "run" : "runs"} for this consultant, in ${currencyName}.`}
        </CardDescription>
      </CardHeader>
      <Table>
        <TableHeader className="bg-primary/5">
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-6 text-xs font-semibold tracking-wide text-primary uppercase">Provision</TableHead>
            {ledgerColumns.map((column, index) => (
              <TableHead
                key={column.key}
                className={cn(
                  "text-right text-xs font-semibold tracking-wide text-primary uppercase",
                  index === ledgerColumns.length - 1 && "pr-6"
                )}
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...ledger.rows, { name: "Total", ...ledger.totals, isTotal: true }].map((row) => (
            <TableRow
              key={row.name}
              className={cn("isTotal" in row && "bg-muted/50 font-semibold hover:bg-muted/50")}
            >
              <TableCell className={cn("pl-6", !("isTotal" in row) && "text-muted-foreground")}>{row.name}</TableCell>
              {ledgerColumns.map((column, index) => (
                <TableCell
                  key={column.key}
                  className={cn("text-right tabular-nums", index === ledgerColumns.length - 1 && "pr-6")}
                >
                  {formatAmount(row[column.key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function PayrollDetailContent({ payroll, canManage }: { payroll: PayrollDetail; canManage: boolean }) {
  const router = useRouter()
  const [sheet, setSheet] = useState({ open: false, key: 0 })
  const [isArchiveOpen, setArchiveOpen] = useState(false)
  const canEdit = canManage && payroll.kind !== null
  const rate = Number(payroll.exchangeRate)
  const inputs = quotationInputRows(payroll)

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      {payrollBackLink}

      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              {formatQuotationTitle(payroll.title)} payroll
            </h2>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{payroll.consultantName ?? "No consultant"}</span>
              {" · "}
              for {payroll.companyName}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {payroll.variant && <Badge>{payroll.variant}</Badge>}
              <Badge variant="outline" className="border-primary/30 text-primary">
                {payroll.clusterLabel}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            {payroll.breakdown && (
              <div className="flex flex-col sm:items-end">
                <span className="text-xs text-muted-foreground">Total invoice</span>
                <span className="text-2xl font-semibold tabular-nums">
                  {payroll.billingCurrency} {rate > 0 ? formatAmount(payroll.breakdown.totalInvoice / rate) : "—"}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {payroll.currencyName} {formatAmount(payroll.breakdown.totalInvoice)}
                </span>
              </div>
            )}
            {canManage && (
              <div className="flex flex-wrap gap-2">
                {canEdit && (
                  <Button variant="outline" onClick={() => setSheet((current) => ({ open: true, key: current.key + 1 }))}>
                    <PencilIcon />
                    Edit
                  </Button>
                )}
                <Button variant="destructive" onClick={() => setArchiveOpen(true)}>
                  <ArchiveIcon />
                  Archive
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          {payroll.ledger ? (
            <ProvisionLedgerCard ledger={payroll.ledger} currencyName={payroll.currencyName} />
          ) : (
            payroll.breakdown && (
              <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                This payroll has no consultant, so its provisions ledger can&apos;t be worked out. Edit it to choose
                one.
              </p>
            )
          )}
          {payroll.breakdown ? (
            payroll.breakdown.sections.map((section) => (
              <BreakdownCard key={section.title} section={section} quotation={payroll} />
            ))
          ) : (
            <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
              The cost breakdown for this cluster hasn&apos;t been ported yet. Open the payroll in the legacy app to see
              it.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card className="h-fit gap-0 py-0">
            <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
              <CardTitle>Paid provisions</CardTitle>
              <CardDescription>Provisions paid out to the consultant with this payroll.</CardDescription>
            </CardHeader>
            {payroll.provisions.length === 0 ? (
              <p className="px-6 py-5 text-sm text-muted-foreground">None paid this month.</p>
            ) : (
              <dl className="flex flex-col gap-2 px-6 py-5 text-sm">
                {payroll.provisions.map((provision) => (
                  <div key={provision.provisionTypeId} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{provision.name}</dt>
                    <dd className="text-right tabular-nums">
                      {payroll.currencyName} {formatAmount(Number(provision.amount))}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>

          <Card className="h-fit gap-0 py-0">
            <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
              <CardTitle>Payroll values</CardTitle>
              <CardDescription>What the breakdown is calculated from.</CardDescription>
            </CardHeader>
            <dl className="flex flex-col gap-2 px-6 py-5 text-sm">
              {inputs.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>

      {canManage && (
        <>
          {canEdit && (
            <PayrollFormSheet
              open={sheet.open}
              payroll={payroll}
              clusterLabel={payroll.clusterLabel}
              formKey={sheet.key}
              onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
            />
          )}
          <ArchivePayrollDialog
            open={isArchiveOpen}
            payroll={payroll}
            onOpenChange={setArchiveOpen}
            onArchived={() => router.push("/admin/payroll")}
          />
        </>
      )}
    </div>
  )
}
