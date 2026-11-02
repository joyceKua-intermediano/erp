"use client"

import { Loader2Icon } from "lucide-react"
import { useId } from "react"
import { useFormStatus } from "react-dom"
import { signInCustomerWithPassword } from "@/app/actions/customer-auth"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" size="lg" disabled={pending} className="h-11 w-full rounded-xl text-sm">
      {pending && <Loader2Icon className="size-4.5 animate-spin" />}
      Sign in
    </Button>
  )
}

export function CustomerLoginForm({ callbackUrl }: { callbackUrl: string }) {
  const emailId = useId()
  const passwordId = useId()

  return (
    <form action={signInCustomerWithPassword}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor={emailId}>Email</FieldLabel>
          <Input id={emailId} name="email" type="email" autoComplete="email" required className="h-10" />
        </Field>
        <Field>
          <FieldLabel htmlFor={passwordId}>Password</FieldLabel>
          <Input
            id={passwordId}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-10"
          />
        </Field>
        <SubmitButton />
      </FieldGroup>
    </form>
  )
}
