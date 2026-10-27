"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArchiveIcon, ArrowLeftIcon, PencilIcon, RefreshCwIcon } from "lucide-react"
import { cn } from "cn"
import { ChooseClusterCard, ModuleDisabledCard } from "@/components/employees/employee-workspace"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useActiveCluster } from "@/hooks/use-clusters"
import { useQuotation } from "@/hooks/use-quotations"
import type { BreakdownSection } from "@/lib/quotations/calculators/types"
import {
  feeTypeLabels,
  formatAmount,
  formatQuotationTitle,
  quotationFields,
  type QuotationDetail,
} from "@/lib/quotations"
import { ArchiveQuotationDialog } from "./archive-quotation-dialog"
import { QuotationFormSheet } from "./quotation-form-sheet"

const quotationsBackLink = (
  <Link
    href="/admin/quotations"
    className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit text-muted-foreground" })}
  >
    <ArrowLeftIcon />
    All quotations
  </Link>
)

function QuotationNotFound({ clusterLabel }: { clusterLabel: string }) {
  return (
    <div className="flex flex-col gap-4">
      {quotationsBackLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-heading text-lg font-semibold">Quotation not found in {clusterLabel}</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            It may have been archived, belong to another cluster, or the link is wrong.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function QuotationLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {quotationsBackLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">This quotation couldn&apos;t be loaded.</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCwIcon />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

type QuotationDetailViewProps = {
  quotationId: string
  canManage: boolean
}

export function QuotationDetailView({ quotationId, canManage }: QuotationDetailViewProps) {
  const activeCluster = useActiveCluster()

  if (!activeCluster) {
    return <ChooseClusterCard description="Quotations are scoped to one Intermediano legal entity at a time." />
  }
  if (!activeCluster.modules.includes("quotations")) {
    return <ModuleDisabledCard module="quotations" clusterLabel={activeCluster.label} />
  }

  return (
    <ClusterQuotationDetail
      key={activeCluster.id}
      quotationId={quotationId}
      clusterLabel={activeCluster.label}
      canManage={canManage}
    />
  )
}

function ClusterQuotationDetail({
  quotationId,
  clusterLabel,
  canManage,
}: QuotationDetailViewProps & { clusterLabel: string }) {
  const { data: quotation, isPending, isError, refetch } = useQuotation(quotationId)

  if (isPending) return <Skeleton className="h-96 rounded-xl" />
  if (isError) return <QuotationLoadError onRetry={() => refetch()} />
  if (!quotation) return <QuotationNotFound clusterLabel={clusterLabel} />

  return <QuotationDetailContent quotation={quotation} canManage={canManage} />
}

function BreakdownCard({ section, quotation }: { section: BreakdownSection; quotation: QuotationDetail }) {
  const rate = Number(quotation.exchangeRate)
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-5 [--card-spacing:--spacing(6)]">
        <CardTitle>{section.title}</CardTitle>
      </CardHeader>
      <Table>
        <TableHeader className="bg-primary/5">
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-6 text-xs font-semibold tracking-wide text-primary uppercase">Item</TableHead>
            <TableHead className="text-right text-xs font-semibold tracking-wide text-primary uppercase">
              {quotation.currencyName}
            </TableHead>
            <TableHead className="pr-6 text-right text-xs font-semibold tracking-wide text-primary uppercase">
              {quotation.billingCurrency}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {section.lines.map((line) => (
            <TableRow key={line.label} className={cn(line.isTotal && "bg-muted/50 font-semibold hover:bg-muted/50")}>
              <TableCell className={cn("pl-6", !line.isTotal && "text-muted-foreground")}>{line.label}</TableCell>
              <TableCell className="text-right tabular-nums">{formatAmount(line.amount)}</TableCell>
              <TableCell className="pr-6 text-right tabular-nums">
                {rate > 0 ? formatAmount(line.amount / rate) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function QuotationDetailContent({ quotation, canManage }: { quotation: QuotationDetail; canManage: boolean }) {
  const router = useRouter()
  const [sheet, setSheet] = useState({ open: false, key: 0 })
  const [isArchiveOpen, setArchiveOpen] = useState(false)
  const canEdit = canManage && quotation.kind !== null
  const canArchive = canManage && !quotation.isPartner
  const rate = Number(quotation.exchangeRate)
  const amount = (value: string) => `${quotation.currencyName} ${formatAmount(Number(value))}`
  const fields = quotation.kind ? quotationFields[quotation.kind] : null
  const optional = (shown: boolean, row: [string, string]): [string, string][] => (shown ? [row] : [])

  const inputs: [string, string][] = [
    ["Gross salary", amount(quotation.grossSalary)],
    ["Exchange rate", `${quotation.exchangeRate} ${quotation.currencyName} per ${quotation.billingCurrency}`],
    ["Type of fee", feeTypeLabels[quotation.isFixFee ? "fixed" : "percentage"]],
    ["Fee", quotation.isFixFee ? `${quotation.billingCurrency} ${formatAmount(Number(quotation.fee))}` : `${quotation.fee}%`],
    ["Bank fee", `${quotation.billingCurrency} ${formatAmount(Number(quotation.bankFee))}`],
    ["Dependent", quotation.dependent ? "Yes" : "No"],
    ["Bonus", amount(quotation.bonus)],
    ["Home allowance", amount(quotation.homeAllowance)],
    ...optional(fields?.transportAllowance ?? true, [
      fields?.transportAllowanceLabel ?? "Transport allowance",
      amount(quotation.transportAllowance),
    ]),
    ...optional(fields?.foodAllowance ?? false, ["Food allowance", amount(quotation.foodAllowance)]),
    ...optional(fields?.familyAllowance ?? false, ["Family allowance", amount(quotation.familyAllowance)]),
    ["Medical allowance", amount(quotation.medicalAllowance)],
    ["Internet allowance", amount(quotation.internetAllowance)],
    ...optional(fields?.legalGratification ?? true, ["Legal gratification", amount(quotation.legalGratification)]),
    ...(fields?.payrollCosts ?? []).map((cost): [string, string] => [
      cost.label,
      cost.isPercent ? `${quotation[cost.key]}%` : amount(quotation[cost.key]),
    ]),
  ]

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      {quotationsBackLink}

      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              {formatQuotationTitle(quotation.title)} quotation
            </h2>
            <p className="text-sm text-muted-foreground">
              for <span className="font-medium text-foreground">{quotation.companyName}</span>
              {" · "}
              {[quotation.countryName, quotation.provinceName].filter(Boolean).join(", ")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {quotation.variant && <Badge>{quotation.variant}</Badge>}
              {quotation.isPartner && <Badge>Partner{quotation.partnerName ? ` · ${quotation.partnerName}` : ""}</Badge>}
              <Badge variant="outline" className="border-primary/30 text-primary">
                {quotation.clusterLabel}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            {quotation.breakdown && (
              <div className="flex flex-col sm:items-end">
                <span className="text-xs text-muted-foreground">Total invoice</span>
                <span className="text-2xl font-semibold tabular-nums">
                  {quotation.billingCurrency}{" "}
                  {rate > 0 ? formatAmount(quotation.breakdown.totalInvoice / rate) : "—"}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {quotation.currencyName} {formatAmount(quotation.breakdown.totalInvoice)}
                </span>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {canEdit && (
                <Button variant="outline" onClick={() => setSheet((current) => ({ open: true, key: current.key + 1 }))}>
                  <PencilIcon />
                  Edit
                </Button>
              )}
              {canArchive && (
                <Button variant="destructive" onClick={() => setArchiveOpen(true)}>
                  <ArchiveIcon />
                  Archive
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          {quotation.breakdown ? (
            quotation.breakdown.sections.map((section) => (
              <BreakdownCard key={section.title} section={section} quotation={quotation} />
            ))
          ) : quotation.isPartner ? (
            <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
              Partner quotations are read-only here. Pricing for {quotation.countryName} hasn&apos;t been ported yet, so
              open the quotation in the legacy app to see its breakdown or edit it.
            </p>
          ) : (
            <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
              The cost breakdown for this cluster hasn&apos;t been ported yet. Open the quotation in the legacy app to
              see it.
            </p>
          )}
        </div>

        <Card className="h-fit gap-0 py-0">
          <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
            <CardTitle>Quoted values</CardTitle>
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

      {canManage && (
        <>
          {canEdit && (
            <QuotationFormSheet
              open={sheet.open}
              quotation={quotation}
              clusterLabel={quotation.clusterLabel}
              formKey={sheet.key}
              onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
            />
          )}
          {canArchive && (
            <ArchiveQuotationDialog
              open={isArchiveOpen}
              quotation={quotation}
              onOpenChange={setArchiveOpen}
              onArchived={() => router.push("/admin/quotations")}
            />
          )}
        </>
      )}
    </div>
  )
}
