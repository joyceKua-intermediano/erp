"use client"

import { Loader2Icon, LogOutIcon } from "lucide-react"
import { useFormStatus } from "react-dom"
import { signOutAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant="outline" size="lg" disabled={pending} className="h-11 w-full gap-2 rounded-xl">
      {pending ? <Loader2Icon className="animate-spin" /> : <LogOutIcon />}
      Sign out
    </Button>
  )
}

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <SubmitButton />
    </form>
  )
}
