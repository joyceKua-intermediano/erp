"use client"

import { Loader2Icon } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useDeletePayslip } from "@/hooks/use-payslips"
import type { PayslipItem } from "@/lib/payslips"

type DeletePayslipDialogProps = {
  payslip: PayslipItem | null
  onOpenChange: (open: boolean) => void
}

export function DeletePayslipDialog({ payslip, onOpenChange }: DeletePayslipDialogProps) {
  const deletePayslip = useDeletePayslip()

  function handleOpenChange(open: boolean) {
    if (!open) deletePayslip.reset()
    onOpenChange(open)
  }

  function handleConfirm() {
    if (!payslip) return
    deletePayslip.mutate(payslip.id, { onSuccess: () => handleOpenChange(false) })
  }

  return (
    <AlertDialog open={payslip !== null} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {payslip?.employeeName}&apos;s {payslip?.periodLabel} payslip?
          </AlertDialogTitle>
          <AlertDialogDescription>
            The file is removed and the employee can no longer open it. This can&apos;t be undone; upload it again if
            you need it back.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deletePayslip.isError && (
          <p role="alert" className="text-sm text-destructive">
            {deletePayslip.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletePayslip.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirm} disabled={deletePayslip.isPending}>
            {deletePayslip.isPending && <Loader2Icon className="animate-spin" />}
            Delete payslip
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
