"use client"

import { useState } from "react"
import { KeyRoundIcon, Loader2Icon } from "lucide-react"
import { z } from "zod"
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
import { PasswordField } from "@/components/customer-accounts/password-field"
import { useResetEmployeePassword } from "@/hooks/use-employees"
import type { EmployeeDetail } from "@/lib/employees"
import { passwordResetSchema } from "@/lib/passwords"

type ResetEmployeePasswordDialogProps = {
  open: boolean
  employee: EmployeeDetail
  onOpenChange: (open: boolean) => void
}

export function ResetEmployeePasswordDialog({ open, employee, onOpenChange }: ResetEmployeePasswordDialogProps) {
  const resetPassword = useResetEmployeePassword()
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<string[] | undefined>()
  const [isDone, setDone] = useState(false)

  function handleOpenChange(open: boolean) {
    if (!open) {
      resetPassword.reset()
      setPassword("")
      setErrors(undefined)
      setDone(false)
    }
    onOpenChange(open)
  }

  // The dialog stays open after saving so the admin can copy the new password.
  function handleConfirm() {
    const parsed = passwordResetSchema.safeParse({ password })
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors.password)
      return
    }
    resetPassword.mutate({ employeeId: employee.id, input: { password } }, { onSuccess: () => setDone(true) })
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-primary/10 text-primary">
            <KeyRoundIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Reset {employee.name}&apos;s password?</AlertDialogTitle>
          <AlertDialogDescription>
            Their old password stops working straight away. Share the new one with them yourself.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <PasswordField
          id="employee-new-password"
          label="New password"
          value={password}
          onChange={(value) => {
            setPassword(value)
            setErrors(undefined)
            setDone(false)
          }}
          errors={errors}
          recipient="employee"
        />
        {resetPassword.isError && (
          <p role="alert" className="text-sm text-destructive">
            {resetPassword.error.message}
          </p>
        )}
        {isDone && (
          <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
            Password reset. Copy it before closing.
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={resetPassword.isPending}>{isDone ? "Close" : "Cancel"}</AlertDialogCancel>
          {!isDone && (
            <AlertDialogAction onClick={handleConfirm} disabled={resetPassword.isPending}>
              {resetPassword.isPending && <Loader2Icon className="animate-spin" />}
              Reset password
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
