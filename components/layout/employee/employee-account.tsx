"use client"

import { Loader2Icon, LogOutIcon } from "lucide-react"
import { useFormStatus } from "react-dom"
import { signOutEmployee } from "@/app/actions/employee-auth"
import { Button } from "@/components/ui/button"

function SignOutSubmit() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant="ghost" size="sm" disabled={pending} className="gap-2">
      {pending ? <Loader2Icon className="animate-spin" /> : <LogOutIcon />}
      <span className="hidden sm:inline">Sign out</span>
    </Button>
  )
}

export function EmployeeAccount({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-48 truncate text-sm text-muted-foreground md:inline" title={email}>
        {name}
      </span>
      <form action={signOutEmployee}>
        <SignOutSubmit />
      </form>
    </div>
  )
}

export function EmployeeProfileSummary({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-base font-semibold">{name}</span>
      <span className="text-sm break-all text-muted-foreground">{email}</span>
    </div>
  )
}
