"use client"

import { Loader2Icon } from "lucide-react"
import type { ReactNode } from "react"
import { useFormStatus } from "react-dom"
import { signInWithGoogle, signInWithMicrosoft } from "@/app/actions/auth"
import { GoogleIcon, MicrosoftIcon } from "@/components/auth/provider-icons"
import { Button } from "@/components/ui/button"

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

export function LoginButtons({ callbackUrl, googleEnabled }: { callbackUrl: string; googleEnabled: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <form action={signInWithMicrosoft}>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <ProviderButton icon={<MicrosoftIcon className="size-4.5" />} label="Continue with Microsoft" />
      </form>
      <form action={signInWithGoogle}>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <ProviderButton
          icon={<GoogleIcon className="size-4.5" />}
          label={googleEnabled ? "Continue with Google" : "Google sign-in not configured"}
          disabled={!googleEnabled}
        />
      </form>
    </div>
  )
}
