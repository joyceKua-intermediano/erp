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
import { useSetCustomerAccountArchived } from "@/hooks/use-customer-accounts"
import type { CustomerAccount } from "@/lib/customer-accounts"

type ArchiveCustomerAccountDialogProps = {
  account: CustomerAccount | null
  onOpenChange: (open: boolean) => void
}

// Archives an active account or restores an archived one, depending on its current state.
export function ArchiveCustomerAccountDialog({ account, onOpenChange }: ArchiveCustomerAccountDialogProps) {
  const setArchived = useSetCustomerAccountArchived()
  const isRestore = account?.archived ?? false

  function handleOpenChange(open: boolean) {
    if (!open) setArchived.reset()
    onOpenChange(open)
  }

  function handleConfirm() {
    if (!account) return
    setArchived.mutate(
      { accountId: account.id, archived: !account.archived },
      { onSuccess: () => handleOpenChange(false) }
    )
  }

  return (
    <AlertDialog open={account !== null} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isRestore ? "Restore" : "Archive"} {account?.name}&apos;s portal account?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isRestore
              ? "They can sign in again with their existing password. Reset it if they've forgotten it."
              : "They can no longer sign in, and are signed out of the portal within a minute. Their approvals stay in place, and you can restore the account later."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {setArchived.isError && (
          <p role="alert" className="text-sm text-destructive">
            {setArchived.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={setArchived.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={isRestore ? "default" : "destructive"}
            onClick={handleConfirm}
            disabled={setArchived.isPending}
          >
            {setArchived.isPending && <Loader2Icon className="animate-spin" />}
            {isRestore ? "Restore account" : "Archive account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
