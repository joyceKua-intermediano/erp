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

export function CustomerAccountActions({ account, handlers }: { account: CustomerAccount; handlers: CustomerAccountHandlers }) {
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
            <DropdownMenuItem onClick={() => handlers.onEdit(account)}>
              <PencilIcon />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlers.onResetPassword(account)}>
              <KeyRoundIcon />
              Reset password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => handlers.onToggleArchived(account)}>
              <ArchiveIcon />
              Archive
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
