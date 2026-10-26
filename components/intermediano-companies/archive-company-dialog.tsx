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
import { useArchiveIntermedianoCompany } from "@/hooks/use-clusters"
import type { IntermedianoCompany } from "@/lib/intermediano-companies"

type ArchiveCompanyDialogProps = {
  open: boolean
  company: IntermedianoCompany | null
  onOpenChange: (open: boolean) => void
  onArchived?: () => void
}

export function ArchiveCompanyDialog({ open, company, onOpenChange, onArchived }: ArchiveCompanyDialogProps) {
  const archiveCompany = useArchiveIntermedianoCompany()
  const linked = company
    ? [
        { label: "employees", count: company.employeeCount },
        { label: "active contracts", count: company.activeContractCount },
        { label: "staff trackers", count: company.staffTrackerCount },
      ].filter((item) => item.count > 0)
    : []

  function handleOpenChange(open: boolean) {
    if (!open) archiveCompany.reset()
    onOpenChange(open)
  }

  function handleArchive() {
    if (!company) return
    archiveCompany.mutate(company.id, {
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
          <AlertDialogTitle>Archive {company?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            It will disappear from the cluster switcher and can&apos;t be picked for new records. Existing records stay
            linked and can still be reported on.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {linked.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {linked.map((item) => (
              <li key={item.label} className="rounded-lg bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">{item.count}</span> {item.label}
              </li>
            ))}
          </ul>
        )}
        {archiveCompany.isError && (
          <p role="alert" className="text-sm text-destructive">
            {archiveCompany.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={archiveCompany.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleArchive} disabled={archiveCompany.isPending}>
            {archiveCompany.isPending && <Loader2Icon className="animate-spin" />}
            Archive company
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
