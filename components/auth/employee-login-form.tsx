"use client"

import { Loader2Icon } from "lucide-react"
import { useId, type ReactNode } from "react"
import { useFormStatus } from "react-dom"
import {
  signInEmployeeWithGoogle,
  signInEmployeeWithMicrosoft,
  signInEmployeeWithPassword,
} from "@/app/actions/employee-auth"
import { GoogleIcon, MicrosoftIcon } from "@/components/auth/provider-icons"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" size="lg" disabled={pending} className="h-11 w-full rounded-xl text-sm">
      {pending && <Loader2Icon className="size-4.5 animate-spin" />}
      {children}
    </Button>
  )
}

function ProviderButton({ icon, label, disabled }: { icon: ReactNode; label: string; disabled?: boolean }) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant="outline"
      size="lg"
      disabled={disabled || pending}
      className="h-11 w-full gap-3 rounded-xl text-sm"
    >
      {pending ? <Loader2Icon className="size-4.5 animate-spin" /> : icon}
      {label}
    </Button>
  )
}

type EmployeeLoginFormProps = {
  callbackUrl: string
  googleEnabled: boolean
  microsoftEnabled: boolean
}

export function EmployeeLoginForm({ callbackUrl, googleEnabled, microsoftEnabled }: EmployeeLoginFormProps) {
  const emailId = useId()
  const passwordId = useId()

  return (
    <div className="flex flex-col gap-5">
      <form action={signInEmployeeWithPassword}>
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
          <SubmitButton>Sign in</SubmitButton>
        </FieldGroup>
      </form>
      <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">or</FieldSeparator>
      <div className="flex flex-col gap-3">
        <form action={signInEmployeeWithMicrosoft}>
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <ProviderButton
            icon={<MicrosoftIcon className="size-4.5" />}
            label={microsoftEnabled ? "Continue with Microsoft" : "Microsoft sign-in not configured"}
            disabled={!microsoftEnabled}
          />
        </form>
        <form action={signInEmployeeWithGoogle}>
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <ProviderButton
            icon={<GoogleIcon className="size-4.5" />}
            label={googleEnabled ? "Continue with Google" : "Google sign-in not configured"}
            disabled={!googleEnabled}
          />
        </form>
      </div>
    </div>
  )
}
