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
import { useArchiveQuotation } from "@/hooks/use-quotations"
import { formatQuotationTitle, type QuotationListItem } from "@/lib/quotations"

type ArchiveQuotationDialogProps = {
  open: boolean
  quotation: Pick<QuotationListItem, "id" | "title" | "companyName"> | null
  onOpenChange: (open: boolean) => void
  onArchived?: () => void
}

export function ArchiveQuotationDialog({ open, quotation, onOpenChange, onArchived }: ArchiveQuotationDialogProps) {
  const archiveQuotation = useArchiveQuotation()

  function handleOpenChange(open: boolean) {
    if (!open) archiveQuotation.reset()
    onOpenChange(open)
  }

  function handleArchive() {
    if (!quotation) return
    archiveQuotation.mutate(quotation.id, {
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
            Archive the {quotation ? formatQuotationTitle(quotation.title) : ""} quotation for {quotation?.companyName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            It will disappear from the quotation list. Contracts already linked to it keep their link.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {archiveQuotation.isError && (
          <p role="alert" className="text-sm text-destructive">
            {archiveQuotation.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={archiveQuotation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleArchive} disabled={archiveQuotation.isPending}>
            {archiveQuotation.isPending && <Loader2Icon className="animate-spin" />}
            Archive quotation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
