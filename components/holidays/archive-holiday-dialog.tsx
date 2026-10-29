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
import { useArchiveHolidaySet } from "@/hooks/use-holidays"
import type { HolidaySet } from "@/lib/holidays"

type ArchiveHolidayDialogProps = {
  open: boolean
  holidaySet: HolidaySet | null
  onOpenChange: (open: boolean) => void
}

export function ArchiveHolidayDialog({ open, holidaySet, onOpenChange }: ArchiveHolidayDialogProps) {
  const archiveHolidaySet = useArchiveHolidaySet()

  function handleOpenChange(open: boolean) {
    if (!open) archiveHolidaySet.reset()
    onOpenChange(open)
  }

  function handleArchive() {
    if (!holidaySet) return
    archiveHolidaySet.mutate(holidaySet.id, { onSuccess: () => handleOpenChange(false) })
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <ArchiveIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>
            Archive {holidaySet?.countryName} {holidaySet?.year} holidays?
          </AlertDialogTitle>
          <AlertDialogDescription>
            The list will disappear from Holidays. Adding holidays for the same country and year later restores this
            record with the new dates.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {archiveHolidaySet.isError && (
          <p role="alert" className="text-sm text-destructive">
            {archiveHolidaySet.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={archiveHolidaySet.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleArchive} disabled={archiveHolidaySet.isPending}>
            {archiveHolidaySet.isPending && <Loader2Icon className="animate-spin" />}
            Archive holidays
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
