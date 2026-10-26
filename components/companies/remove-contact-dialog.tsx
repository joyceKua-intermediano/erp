"use client"

import { Loader2Icon, UserMinusIcon } from "lucide-react"
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
import { useRemoveContact } from "@/hooks/use-companies"
import type { CompanyContact } from "@/lib/companies"

type RemoveContactDialogProps = {
  open: boolean
  companyId: string
  contact: CompanyContact | null
  onOpenChange: (open: boolean) => void
}

export function RemoveContactDialog({ open, companyId, contact, onOpenChange }: RemoveContactDialogProps) {
  const removeContact = useRemoveContact(companyId)

  function handleOpenChange(open: boolean) {
    if (!open) removeContact.reset()
    onOpenChange(open)
  }

  function handleRemove() {
    if (!contact) return
    removeContact.mutate(contact.id, { onSuccess: () => handleOpenChange(false) })
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <UserMinusIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Remove {contact?.fullName}?</AlertDialogTitle>
          <AlertDialogDescription>
            {contact?.isMainContact
              ? "They're the main contact, so the company will have no main contact until you pick another one."
              : "They no longer appear on this company. Leads that reference them keep the link."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {removeContact.isError && (
          <p role="alert" className="text-sm text-destructive">
            {removeContact.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removeContact.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleRemove} disabled={removeContact.isPending}>
            {removeContact.isPending && <Loader2Icon className="animate-spin" />}
            Remove contact
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
