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
import { useArchiveContract } from "@/hooks/use-contracts"
import type { ClusterContract } from "@/lib/contracts"

type ArchiveContractDialogProps = {
  open: boolean
  contract: Pick<ClusterContract, "id" | "employeeName" | "jobTitle"> | null
  onOpenChange: (open: boolean) => void
  onArchived?: () => void
}

export function ArchiveContractDialog({ open, contract, onOpenChange, onArchived }: ArchiveContractDialogProps) {
  const archiveContract = useArchiveContract()

  function handleOpenChange(open: boolean) {
    if (!open) archiveContract.reset()
    onOpenChange(open)
  }

  function handleArchive() {
    if (!contract) return
    archiveContract.mutate(contract.id, {
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
            Archive {contract?.employeeName}&apos;s contract{contract?.jobTitle ? ` as ${contract.jobTitle}` : ""}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            It will disappear from the contract list and the employee&apos;s record. Timesheets and payslips already
            linked to the employee are not affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {archiveContract.isError && (
          <p role="alert" className="text-sm text-destructive">
            {archiveContract.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={archiveContract.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleArchive} disabled={archiveContract.isPending}>
            {archiveContract.isPending && <Loader2Icon className="animate-spin" />}
            Archive contract
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
