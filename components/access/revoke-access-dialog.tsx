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
import { useRevokeUserAccess } from "@/hooks/use-users"
import type { AdminUser } from "@/lib/users"

type RevokeAccessDialogProps = {
  open: boolean
  user: AdminUser | null
  onOpenChange: (open: boolean) => void
}

export function RevokeAccessDialog({ open, user, onOpenChange }: RevokeAccessDialogProps) {
  const revokeAccess = useRevokeUserAccess()

  function handleOpenChange(open: boolean) {
    if (!open) revokeAccess.reset()
    onOpenChange(open)
  }

  function handleRevoke() {
    if (!user) return
    revokeAccess.mutate(user.id, { onSuccess: () => handleOpenChange(false) })
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke access for {user?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            They&apos;ll lose access to the admin console within 5 minutes. Their record and everything linked to it
            stays in place, so you can restore access later by assigning a role.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {revokeAccess.isError && (
          <p role="alert" className="text-sm text-destructive">
            {revokeAccess.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={revokeAccess.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleRevoke} disabled={revokeAccess.isPending}>
            {revokeAccess.isPending && <Loader2Icon className="animate-spin" />}
            Revoke access
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
