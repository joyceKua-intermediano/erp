"use client"

import { Loader2Icon, LogOutIcon } from "lucide-react"
import { useTransition } from "react"
import { signOutAction } from "@/app/actions/auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2)
  return initials.toUpperCase()
}

export function AdminUserMenu({ name, email, role }: { name: string; email: string; role: string | null }) {
  const [isSigningOut, startSignOut] = useTransition()

  function handleSignOut() {
    startSignOut(async () => {
      await signOutAction()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="h-10 gap-2.5 rounded-xl px-1.5 md:pr-3" aria-label="Account menu">
            <Avatar>
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initialsOf(name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden flex-col items-start leading-tight md:flex">
              <span className="text-sm font-semibold">{name}</span>
              {role && <span className="text-xs text-muted-foreground capitalize">{role}</span>}
            </span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5">
            <span className="text-sm font-medium text-foreground">{name}</span>
            <span className="truncate font-normal">{email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={isSigningOut} onClick={handleSignOut}>
          {isSigningOut ? <Loader2Icon className="animate-spin" /> : <LogOutIcon />}
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
