"use client"

import { ArchiveIcon, Loader2Icon } from "lucide-react"
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
import { useArchivePayroll } from "@/hooks/use-payroll"
import type { PayrollListItem } from "@/lib/payroll"
import { formatQuotationTitle } from "@/lib/quotations"

type ArchivePayrollDialogProps = {
  open: boolean
  payroll: Pick<PayrollListItem, "id" | "title" | "consultantName" | "companyName"> | null
  onOpenChange: (open: boolean) => void
  onArchived?: () => void
}

export function ArchivePayrollDialog({ open, payroll, onOpenChange, onArchived }: ArchivePayrollDialogProps) {
  const archivePayroll = useArchivePayroll()

  function handleOpenChange(open: boolean) {
    if (!open) archivePayroll.reset()
    onOpenChange(open)
  }

  function handleArchive() {
    if (!payroll) return
    archivePayroll.mutate(payroll.id, {
      onSuccess: () => {
        handleOpenChange(false)
        onArchived?.()
      },
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <ArchiveIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>
            Archive the {payroll ? formatQuotationTitle(payroll.title) : ""} payroll for{" "}
            {payroll?.consultantName ?? payroll?.companyName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            It will disappear from the payroll list, and its accrued and paid provisions will no longer count towards
            this consultant&apos;s later payroll runs.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {archivePayroll.isError && (
          <p role="alert" className="text-sm text-destructive">
            {archivePayroll.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={archivePayroll.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleArchive} disabled={archivePayroll.isPending}>
            {archivePayroll.isPending && <Loader2Icon className="animate-spin" />}
            Archive payroll
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
