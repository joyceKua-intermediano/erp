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
import { useArchiveCompany } from "@/hooks/use-companies"
import type { Company } from "@/lib/companies"

type ArchiveCompanyDialogProps = {
  open: boolean
  company: Company | null
  onOpenChange: (open: boolean) => void
  onArchived?: () => void
}

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural
}

export function ArchiveCompanyDialog({ open, company, onOpenChange, onArchived }: ArchiveCompanyDialogProps) {
  const archiveCompany = useArchiveCompany()
  const linkedCounts = company
    ? [
        { count: company.contactCount, label: pluralize(company.contactCount, "contact", "contacts") },
        { count: company.contractCount, label: pluralize(company.contractCount, "contract", "contracts") },
        { count: company.leadCount, label: pluralize(company.leadCount, "lead", "leads") },
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
            It disappears from the company directory. Its contacts, contracts and leads are kept as they are.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {linkedCounts.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {linkedCounts.map((item) => (
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
