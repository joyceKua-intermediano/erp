"use client"

import type { UseMutationResult } from "@tanstack/react-query"
import { useId, useState } from "react"
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react"
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { useReviewExpenseItem } from "@/hooks/use-expenses"
import { claimCurrency, formatExpenseDate, formatMoney, type ExpenseClaim, type ExpenseReviewInput } from "@/lib/expenses"

export type ExpenseItemReview = { claim: ExpenseClaim; index: number; status: "approved" | "rejected" }

const MAX_COMMENT_LENGTH = 1000

type ReviewExpenseItemDialogProps = {
  review: ExpenseItemReview | null
  onOpenChange: (open: boolean) => void
}

export type ExpenseItemReviewMutation = Pick<
  UseMutationResult<unknown, Error, { expenseId: string; input: ExpenseReviewInput }>,
  "mutate" | "reset" | "isPending" | "isError" | "error"
>

export function ReviewExpenseItemDialog(props: ReviewExpenseItemDialogProps) {
  const reviewItem = useReviewExpenseItem()
  return <ReviewExpenseItemDialogView {...props} reviewItem={reviewItem} />
}

export function ReviewExpenseItemDialogView({
  review,
  onOpenChange,
  reviewItem,
}: ReviewExpenseItemDialogProps & { reviewItem: ExpenseItemReviewMutation }) {
  const commentId = useId()
  const [comments, setComments] = useState("")
  const isApprove = review?.status === "approved"
  const line = review ? review.claim.lines[review.index] : null
  const amount = review && line ? (review.claim.type === "abroad" ? line.usd : line.localTotal) : null

  function handleOpenChange(open: boolean) {
    if (!open) {
      reviewItem.reset()
      setComments("")
    }
    onOpenChange(open)
  }

  function handleConfirm() {
    if (!review) return
    reviewItem.mutate(
      {
        expenseId: review.claim.id,
        input: { index: review.index, status: review.status, comments, version: review.claim.version },
      },
      { onSuccess: () => handleOpenChange(false) }
    )
  }

  return (
    <AlertDialog open={review !== null} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia
            className={
              isApprove ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
            }
          >
            {isApprove ? <CheckIcon /> : <XIcon />}
          </AlertDialogMedia>
          <AlertDialogTitle>
            {isApprove ? "Approve" : "Reject"} expense {review ? review.index + 1 : ""}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {review && line && (
              <>
                {line.description || "No description"} · {formatExpenseDate(line.date)}
                {amount !== null && <> · {formatMoney(amount, claimCurrency(review.claim))}</>}.{" "}
              </>
            )}
            {isApprove
              ? "Approved expenses can no longer be changed by the employee."
              : "The employee sees your comment and can correct the expense and send it again."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor={commentId}>Comment</FieldLabel>
          <Textarea
            id={commentId}
            value={comments}
            maxLength={MAX_COMMENT_LENGTH}
            onChange={(event) => setComments(event.target.value)}
            placeholder={isApprove ? "Optional note for the employee" : "Tell the employee what to fix"}
          />
          <FieldDescription>
            {comments.length}/{MAX_COMMENT_LENGTH} characters
          </FieldDescription>
        </Field>
        {reviewItem.isError && (
          <p role="alert" className="text-sm text-destructive">
            {reviewItem.error?.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={reviewItem.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={isApprove ? "default" : "destructive"}
            onClick={handleConfirm}
            disabled={reviewItem.isPending}
          >
            {reviewItem.isPending && <Loader2Icon className="animate-spin" />}
            {isApprove ? "Approve expense" : "Reject expense"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
