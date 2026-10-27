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
import { useArchivePartner } from "@/hooks/use-partners"
import type { Partner } from "@/lib/partners"

type ArchivePartnerDialogProps = {
  open: boolean
  partner: Partner | null
  onOpenChange: (open: boolean) => void
  onArchived?: () => void
}

export function ArchivePartnerDialog({ open, partner, onOpenChange, onArchived }: ArchivePartnerDialogProps) {
  const archivePartner = useArchivePartner()
  const links = [
    { count: partner?.contractCount ?? 0, singular: "contract", plural: "contracts" },
    { count: partner?.portalAccountCount ?? 0, singular: "portal account", plural: "portal accounts" },
  ].filter((link) => link.count > 0)

  function handleOpenChange(open: boolean) {
    if (!open) archivePartner.reset()
    onOpenChange(open)
  }

  function handleArchive() {
    if (!partner) return
    archivePartner.mutate(partner.id, {
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
          <AlertDialogTitle>Archive {partner?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            They&apos;ll disappear from the partner list. Contracts and portal accounts already linked to them stay
            unchanged.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {links.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {links.map((link) => (
              <li key={link.singular} className="rounded-lg bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">{link.count}</span>{" "}
                {link.count === 1 ? link.singular : link.plural}
              </li>
            ))}
          </ul>
        )}
        {archivePartner.isError && (
          <p role="alert" className="text-sm text-destructive">
            {archivePartner.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={archivePartner.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleArchive} disabled={archivePartner.isPending}>
            {archivePartner.isPending && <Loader2Icon className="animate-spin" />}
            Archive partner
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
