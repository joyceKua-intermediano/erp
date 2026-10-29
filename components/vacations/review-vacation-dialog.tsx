"use client"

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
import { useReviewVacationRequest } from "@/hooks/use-vacation-requests"
import { formatDays, formatVacationRange, type VacationRequestItem } from "@/lib/vacations"

export type VacationReview = { request: VacationRequestItem; status: "approved" | "rejected" }

type ReviewVacationDialogProps = {
  review: VacationReview | null
  onOpenChange: (open: boolean) => void
}

export function ReviewVacationDialog({ review, onOpenChange }: ReviewVacationDialogProps) {
  const reviewRequest = useReviewVacationRequest()
  const isApprove = review?.status === "approved"

  function handleOpenChange(open: boolean) {
    if (!open) reviewRequest.reset()
    onOpenChange(open)
  }

  function handleConfirm() {
    if (!review) return
    reviewRequest.mutate(
      { requestId: review.request.id, input: { status: review.status } },
      { onSuccess: () => handleOpenChange(false) }
    )
  }

  return (
    <AlertDialog open={review !== null} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia
            className={
              isApprove
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive"
            }
          >
            {isApprove ? <CheckIcon /> : <XIcon />}
          </AlertDialogMedia>
          <AlertDialogTitle>
            {isApprove ? "Approve" : "Reject"} {review?.request.employeeName}&apos;s vacation?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {review && (
              <>
                {formatVacationRange(review.request.startDate, review.request.endDate)} ·{" "}
                {formatDays(review.request.numberOfDays)}.{" "}
              </>
            )}
            {isApprove
              ? "Approved days are taken from the employee's balance, and the request can no longer be changed."
              : "The employee can correct the request and send it again."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {reviewRequest.isError && (
          <p role="alert" className="text-sm text-destructive">
            {reviewRequest.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={reviewRequest.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={isApprove ? "default" : "destructive"}
            onClick={handleConfirm}
            disabled={reviewRequest.isPending}
          >
            {reviewRequest.isPending && <Loader2Icon className="animate-spin" />}
            {isApprove ? "Approve request" : "Reject request"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
