"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeftIcon, CheckCheckIcon, CheckIcon, Loader2Icon, RefreshCwIcon, XIcon } from "lucide-react"
import { LineAmounts, ReceiptPreview } from "@/components/expenses/expense-claim-detail"
import { ReviewExpenseItemDialogView, type ExpenseItemReview } from "@/components/expenses/review-expense-item-dialog"
import { TimesheetStatusBadge } from "@/components/timesheets/timesheet-status-badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useApproveCustomerExpenseClaim,
  useCustomerExpenseClaim,
  useReviewCustomerExpenseItem,
} from "@/hooks/use-customer-expenses"
import {
  claimCurrency,
  customerReceiptUrl,
  expenseClaimTitle,
  expenseTypeLabels,
  formatExpenseDate,
  formatMoney,
  type ExpenseClaim,
} from "@/lib/expenses"

const backLink = (
  <Link
    href="/customer/expenses"
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

export function CustomerExpenseDetail({ expenseId }: { expenseId: string }) {
  const { data: claim, isPending, isError, refetch } = useCustomerExpenseClaim(expenseId)

  if (isPending) return <Skeleton className="h-96 rounded-xl" />
  if (isError) return <MessageCard message="This expense claim couldn't be loaded." onRetry={() => refetch()} />
  if (!claim) {
    return <MessageCard title="Expense claim not found" message="It may have been removed, or the link is wrong." />
  }

  return <ExpenseClaimContent claim={claim} />
}

function ApproveAllDialog({
  claim,
  pendingItems,
  open,
  onOpenChange,
}: {
  claim: ExpenseClaim
  pendingItems: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const approveClaim = useApproveCustomerExpenseClaim()

  function handleOpenChange(next: boolean) {
    if (!next) approveClaim.reset()
    onOpenChange(next)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <CheckCheckIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>
            Approve {pendingItems} pending {pendingItems === 1 ? "expense" : "expenses"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Every expense still waiting on {claim.employeeName}&apos;s claim is approved. Expenses you already reviewed keep
            their decision. Approved expenses can no longer be changed by the employee.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {approveClaim.isError && (
          <p role="alert" className="text-sm text-destructive">
            {approveClaim.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={approveClaim.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              approveClaim.mutate(
                { expenseId: claim.id, version: claim.version },
                { onSuccess: () => handleOpenChange(false) }
              )
            }
            disabled={approveClaim.isPending}
          >
            {approveClaim.isPending && <Loader2Icon className="animate-spin" />}
            Approve all
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ExpenseClaimContent({ claim }: { claim: ExpenseClaim }) {
  const [review, setReview] = useState<ExpenseItemReview | null>(null)
  const [isApproveAllOpen, setApproveAllOpen] = useState(false)
  const reviewItem = useReviewCustomerExpenseItem()
  const currency = claimCurrency(claim)
  const canReview = claim.status !== "approved"
  const pendingItems = claim.lines.filter((line) => line.status === "pending").length

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      {backLink}

      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-heading text-xl font-semibold tracking-tight">{expenseClaimTitle(claim)}</h2>
            <p className="text-sm font-medium">{claim.employeeName}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <TimesheetStatusBadge status={claim.status} />
              {claim.type && <span>{expenseTypeLabels[claim.type]}</span>}
              {claim.costCenter && <span>· Cost center {claim.costCenter}</span>}
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
        <CardHeader className="gap-3 border-b py-5 sm:grid-cols-[1fr_auto] [--card-spacing:--spacing(6)]">
          <div className="flex flex-col gap-1">
            <CardTitle>Expenses</CardTitle>
            <CardDescription>
              {claim.lines.length} {claim.lines.length === 1 ? "expense" : "expenses"}
              {pendingItems > 0 && canReview ? `, ${pendingItems} waiting for your review` : ""}. Each one is approved or
              rejected on its own; the claim is approved once all of them are.
            </CardDescription>
          </div>
          {canReview && pendingItems > 0 && (
            <Button onClick={() => setApproveAllOpen(true)} className="w-fit">
              <CheckCheckIcon />
              Approve all pending
            </Button>
          )}
        </CardHeader>
        {claim.lines.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">This claim has no expenses.</p>
        ) : (
          <ul className="divide-y">
            {claim.lines.map((line, index) => (
              <li key={index} className="flex flex-col gap-5 px-6 py-5 sm:flex-row">
                <ReceiptPreview
                  src={line.receipt ? customerReceiptUrl(claim.id, index) : null}
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

      <ReviewExpenseItemDialogView
        review={review}
        onOpenChange={(open) => !open && setReview(null)}
        reviewItem={reviewItem}
      />
      <ApproveAllDialog
        key={claim.version}
        claim={claim}
        pendingItems={pendingItems}
        open={isApproveAllOpen}
        onOpenChange={setApproveAllOpen}
      />
    </div>
  )
}
