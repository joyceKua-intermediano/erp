"use client"

import { useState } from "react"
import { EyeIcon, EyeOffIcon, WandSparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { generatePassword, MIN_PASSWORD_LENGTH } from "@/lib/passwords"

type PasswordFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  errors?: string[]
  // Who the admin shares the password with.
  recipient?: string
}

// No email is sent, so the admin shares the password themselves; generating one shows it so it can be copied.
export function PasswordField({ id, label, value, onChange, errors, recipient = "customer" }: PasswordFieldProps) {
  const [isVisible, setVisible] = useState(false)

  return (
    <Field data-invalid={Boolean(errors?.length)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id={id}
            type={isVisible ? "text" : "password"}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            autoComplete="new-password"
            aria-invalid={Boolean(errors?.length)}
            className="pr-9 font-mono"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setVisible((current) => !current)}
            aria-label={isVisible ? "Hide password" : "Show password"}
            className="absolute top-1/2 right-1 -translate-y-1/2"
          >
            {isVisible ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onChange(generatePassword())
            setVisible(true)
          }}
        >
          <WandSparklesIcon />
          Generate
        </Button>
      </div>
      <FieldDescription>
        At least {MIN_PASSWORD_LENGTH} characters. Copy it now and share it with the {recipient}; no email is sent.
      </FieldDescription>
      <FieldError errors={errors?.map((message) => ({ message }))} />
    </Field>
  )
}
