"use client"

import { ArchiveIcon, ArchiveRestoreIcon, KeyRoundIcon, MoreHorizontalIcon, PencilIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { CustomerAccount } from "@/lib/customer-accounts"
import type { RecordPermissions } from "@/lib/permissions"

export type CustomerAccountHandlers = {
  onEdit: (account: CustomerAccount) => void
  onResetPassword: (account: CustomerAccount) => void
  onToggleArchived: (account: CustomerAccount) => void
}

export function CustomerAccountStatusBadge({ archived }: { archived: boolean }) {
  return archived ? (
    <Badge variant="outline" className="border-dashed text-muted-foreground">
      Archived
    </Badge>
  ) : (
    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Active</Badge>
  )
}

export function CustomerAccountActions({
  account,
  handlers,
  can,
}: {
  account: CustomerAccount
  handlers: CustomerAccountHandlers
  can: RecordPermissions
}) {
  const canEdit = !account.archived && can.edit
  if (!canEdit && !can.delete) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${account.name}`}>
            <MoreHorizontalIcon />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        {account.archived ? (
          <DropdownMenuItem onClick={() => handlers.onToggleArchived(account)}>
            <ArchiveRestoreIcon />
            Restore
          </DropdownMenuItem>
        ) : (
          <>
            {canEdit && (
              <>
                <DropdownMenuItem onClick={() => handlers.onEdit(account)}>
                  <PencilIcon />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlers.onResetPassword(account)}>
                  <KeyRoundIcon />
                  Reset password
                </DropdownMenuItem>
              </>
            )}
            {canEdit && can.delete && <DropdownMenuSeparator />}
            {can.delete && (
              <DropdownMenuItem variant="destructive" onClick={() => handlers.onToggleArchived(account)}>
                <ArchiveIcon />
                Archive
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
