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
import { useArchiveConsultant } from "@/hooks/use-consultants"
import type { Consultant } from "@/lib/consultants"

type ArchiveConsultantDialogProps = {
  open: boolean
  consultant: Consultant | null
  onOpenChange: (open: boolean) => void
  onArchived?: () => void
}

export function ArchiveConsultantDialog({ open, consultant, onOpenChange, onArchived }: ArchiveConsultantDialogProps) {
  const archiveConsultant = useArchiveConsultant()
  const employeeCount = consultant?.employeeCount ?? 0

  function handleOpenChange(open: boolean) {
    if (!open) archiveConsultant.reset()
    onOpenChange(open)
  }

  function handleArchive() {
    if (!consultant) return
    archiveConsultant.mutate(consultant.id, {
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
          <AlertDialogTitle>Archive {consultant?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            They can&apos;t be assigned to new employees. Employees already assigned keep them as their consultant.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {employeeCount > 0 && (
          <ul className="flex flex-wrap gap-2">
            <li className="rounded-lg bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{employeeCount}</span>{" "}
              {employeeCount === 1 ? "employee" : "employees"}
            </li>
          </ul>
        )}
        {archiveConsultant.isError && (
          <p role="alert" className="text-sm text-destructive">
            {archiveConsultant.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={archiveConsultant.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleArchive} disabled={archiveConsultant.isPending}>
            {archiveConsultant.isPending && <Loader2Icon className="animate-spin" />}
            Archive consultant
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
