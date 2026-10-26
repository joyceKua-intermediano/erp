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
import { useArchiveEmployee } from "@/hooks/use-employees"
import type { EmployeeDetail } from "@/lib/employees"

type ArchiveEmployeeDialogProps = {
  open: boolean
  employee: EmployeeDetail | null
  onOpenChange: (open: boolean) => void
  onArchived?: () => void
}

export function ArchiveEmployeeDialog({ open, employee, onOpenChange, onArchived }: ArchiveEmployeeDialogProps) {
  const archiveEmployee = useArchiveEmployee()
  const contractCount = employee?.contracts.length ?? 0

  function handleOpenChange(open: boolean) {
    if (!open) archiveEmployee.reset()
    onOpenChange(open)
  }

  function handleArchive() {
    if (!employee) return
    archiveEmployee.mutate(employee.id, {
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
          <AlertDialogTitle>Archive {employee?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            They will disappear from the employee list. Their contracts, timesheets and payslips stay linked and can
            still be reported on.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {contractCount > 0 && (
          <ul className="flex flex-wrap gap-2">
            <li className="rounded-lg bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{contractCount}</span>{" "}
              {contractCount === 1 ? "contract" : "contracts"}
            </li>
          </ul>
        )}
        {archiveEmployee.isError && (
          <p role="alert" className="text-sm text-destructive">
            {archiveEmployee.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={archiveEmployee.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleArchive} disabled={archiveEmployee.isPending}>
            {archiveEmployee.isPending && <Loader2Icon className="animate-spin" />}
            Archive employee
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
