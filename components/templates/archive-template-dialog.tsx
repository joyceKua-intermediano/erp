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
import { useArchiveTemplate } from "@/hooks/use-templates"
import type { ContractTemplate } from "@/lib/templates"

type ArchiveTemplateDialogProps = {
  open: boolean
  template: Pick<ContractTemplate, "id" | "name" | "contractCount"> | null
  onOpenChange: (open: boolean) => void
  onArchived?: () => void
}

export function ArchiveTemplateDialog({ open, template, onOpenChange, onArchived }: ArchiveTemplateDialogProps) {
  const archiveTemplate = useArchiveTemplate()
  const contractCount = template?.contractCount ?? 0

  function handleOpenChange(open: boolean) {
    if (!open) archiveTemplate.reset()
    onOpenChange(open)
  }

  function handleArchive() {
    if (!template) return
    archiveTemplate.mutate(template.id, {
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
          <AlertDialogTitle>Archive {template?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            It can no longer be picked for new contracts. Contracts that already use it keep rendering with it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {contractCount > 0 && (
          <ul className="flex flex-wrap gap-2">
            <li className="rounded-lg bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              Used by <span className="font-semibold text-foreground tabular-nums">{contractCount}</span>{" "}
              {contractCount === 1 ? "contract" : "contracts"}
            </li>
          </ul>
        )}
        {archiveTemplate.isError && (
          <p role="alert" className="text-sm text-destructive">
            {archiveTemplate.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={archiveTemplate.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleArchive} disabled={archiveTemplate.isPending}>
            {archiveTemplate.isPending && <Loader2Icon className="animate-spin" />}
            Archive template
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
