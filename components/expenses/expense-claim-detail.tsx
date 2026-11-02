"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeftIcon, CheckIcon, ImageOffIcon, RefreshCwIcon, XIcon } from "lucide-react"
import { ChooseClusterCard, ModuleDisabledCard } from "@/components/employees/employee-workspace"
import { TimesheetStatusBadge } from "@/components/timesheets/timesheet-status-badge"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useActiveCluster } from "@/hooks/use-clusters"
import { useExpenseClaim } from "@/hooks/use-expenses"
import {
  claimCurrency,
  expenseClaimTitle,
  expenseTypeLabels,
  formatExpenseDate,
  formatMoney,
  receiptUrl,
  type ExpenseClaim,
  type ExpenseLine,
} from "@/lib/expenses"
import { CHOOSE_CLUSTER_DESCRIPTION } from "./expense-workspace"
import { ReviewExpenseItemDialog, type ExpenseItemReview } from "./review-expense-item-dialog"

const backLink = (
  <Link
    href="/admin/expenses"
    className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit text-muted-foreground" })}
  >
    <ArrowLeftIcon />
    All expense claims
  </Link>
)

function MessageCard({ title, message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {backLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          {title && <h2 className="font-heading text-lg font-semibold">{title}</h2>}
          <p className="max-w-md text-sm text-muted-foreground">{message}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCwIcon />
              Try again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

type ExpenseClaimDetailViewProps = {
  expenseId: string
  canManage: boolean
}

export function ExpenseClaimDetailView({ expenseId, canManage }: ExpenseClaimDetailViewProps) {
  const activeCluster = useActiveCluster()

  if (!activeCluster) return <ChooseClusterCard description={CHOOSE_CLUSTER_DESCRIPTION} />
  if (!activeCluster.modules.includes("expenses")) {
    return <ModuleDisabledCard module="expenses" clusterLabel={activeCluster.label} />
  }

  return (
    <ClusterExpenseClaim
      key={activeCluster.id}
      expenseId={expenseId}
      clusterId={activeCluster.id}
      clusterLabel={activeCluster.label}
      canManage={canManage}
    />
  )
}

function ClusterExpenseClaim({
  expenseId,
  clusterId,
  clusterLabel,
  canManage,
}: ExpenseClaimDetailViewProps & { clusterId: string; clusterLabel: string }) {
  const { data: claim, isPending, isError, refetch } = useExpenseClaim(expenseId)

  if (isPending) return <Skeleton className="h-96 rounded-xl" />
  if (isError) return <MessageCard message="This expense claim couldn't be loaded." onRetry={() => refetch()} />
  if (!claim) {
    return (
      <MessageCard
        title={`Expense claim not found in ${clusterLabel}`}
        message="It may belong to an employee of another cluster, or the link is wrong."
      />
    )
  }

  return <ExpenseClaimContent claim={claim} clusterId={clusterId} clusterLabel={clusterLabel} canManage={canManage} />
}

function ReceiptPreview({ src, label }: { src: string | null; label: string }) {
  const [isBroken, setBroken] = useState(false)

  return (
    <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border bg-muted/40 sm:w-48">
      {src && !isBroken ? (
        <a href={src} target="_blank" rel="noreferrer" className="absolute inset-0" aria-label={`Open ${label}`}>
          <Image src={src} alt={label} fill unoptimized sizes="12rem" className="object-cover" onError={() => setBroken(true)} />
        </a>
      ) : (
        <span className="flex flex-col items-center gap-1 px-3 text-center text-xs text-muted-foreground">
          <ImageOffIcon className="size-5" />
          {src ? "Receipt not available" : "No receipt"}
        </span>
      )}
    </div>
  )
}

function AmountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}

function LineAmounts({ claim, line }: { claim: ExpenseClaim; line: ExpenseLine }) {
  const local = claim.currencyName
  const show = (value: number | null, currency: string | null) => (value === null ? "—" : formatMoney(value, currency))

  if (claim.type === "abroad") {
    return (
      <div className="flex flex-col gap-1.5">
        <AmountRow label="Amount" value={show(line.usd, "USD")} />
        <AmountRow label="Exchange rate" value={line.exchangeRate === null ? "—" : String(line.exchangeRate)} />
        <AmountRow label={`Amount in ${local ?? "local currency"}`} value={show(line.localCurrency, local)} />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1.5">
      <AmountRow label="Amount" value={show(line.amount, local)} />
      <AmountRow label="Federal tax" value={show(line.federalAmount, local)} />
      <AmountRow label="State tax" value={show(line.stateAmount, local)} />
      <AmountRow label="Total incl. taxes" value={show(line.localTotal, local)} />
    </div>
  )
}

function ExpenseClaimContent({
  claim,
  clusterId,
  clusterLabel,
  canManage,
}: {
  claim: ExpenseClaim
  clusterId: string
  clusterLabel: string
  canManage: boolean
}) {
  const [review, setReview] = useState<ExpenseItemReview | null>(null)
  const currency = claimCurrency(claim)
  const canReview = canManage && claim.status !== "approved"
  const pendingItems = claim.lines.filter((line) => line.status === "pending").length

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      {backLink}

      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-heading text-xl font-semibold tracking-tight">{expenseClaimTitle(claim)}</h2>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{claim.employeeName}</span>
              {claim.companyName && <> · for {claim.companyName}</>}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <TimesheetStatusBadge status={claim.status} />
              <Badge variant="outline" className="border-primary/30 text-primary">
                {clusterLabel}
              </Badge>
              {claim.type && <span>{expenseTypeLabels[claim.type]}</span>}
              {claim.costCenter && <span>· Cost center {claim.costCenter}</span>}
              <span>· Created by {claim.createdBy}</span>
            </div>
          </div>
          <div className="flex gap-8 sm:text-right">
            <div className="flex flex-col sm:items-end">
              <span className="text-xs text-muted-foreground">Claimed</span>
              <span className="text-2xl font-semibold tabular-nums">{formatMoney(claim.totals.claimed, currency)}</span>
              {claim.totals.localEquivalent !== null && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  ≈ {formatMoney(claim.totals.localEquivalent, claim.currencyName)}
                </span>
              )}
            </div>
            <div className="flex flex-col sm:items-end">
              <span className="text-xs text-muted-foreground">Approved</span>
              <span className="text-2xl font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
                {formatMoney(claim.totals.approved, currency)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
          <CardTitle>Expenses</CardTitle>
          <CardDescription>
            {claim.lines.length} {claim.lines.length === 1 ? "expense" : "expenses"}
            {pendingItems > 0 && claim.status !== "approved" ? `, ${pendingItems} waiting for review` : ""}. Each one is
            approved or rejected on its own; the claim is approved once all of them are.
          </CardDescription>
        </CardHeader>
        {claim.lines.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">This claim has no expenses.</p>
        ) : (
          <ul className="divide-y">
            {claim.lines.map((line, index) => (
              <li key={index} className="flex flex-col gap-5 px-6 py-5 sm:flex-row">
                <ReceiptPreview
                  src={line.receipt ? receiptUrl(claim.id, index, clusterId) : null}
                  label={`receipt for expense ${index + 1}`}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">
                        {index + 1}. {line.description || "No description"}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatExpenseDate(line.date)}</span>
                    </div>
                    <TimesheetStatusBadge status={line.status} />
                  </div>
                  <LineAmounts claim={claim} line={line} />
                  {line.comments && (
                    <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm whitespace-pre-line">
                      <span className="font-medium">Comment: </span>
                      <span className="text-muted-foreground">{line.comments}</span>
                    </p>
                  )}
                  {canReview && line.status === "pending" && (
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReview({ claim, index, status: "approved" })}
                        aria-label={`Approve expense ${index + 1}`}
                      >
                        <CheckIcon />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setReview({ claim, index, status: "rejected" })}
                        aria-label={`Reject expense ${index + 1}`}
                      >
                        <XIcon />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ReviewExpenseItemDialog review={review} onOpenChange={(open) => !open && setReview(null)} />
    </div>
  )
}
