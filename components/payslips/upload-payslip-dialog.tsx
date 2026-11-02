"use client"

import { useState, type FormEvent } from "react"
import { Loader2Icon } from "lucide-react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePayslipEmployeeOptions, useUploadPayslip } from "@/hooks/use-payslips"
import { MAX_PAYSLIP_BYTES, payslipUploadSchema, type PayslipUploadInput } from "@/lib/payslips"

type FieldErrors = Partial<Record<keyof PayslipUploadInput | "file", string[]>>

type UploadPayslipDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UploadPayslipDialog({ open, onOpenChange }: UploadPayslipDialogProps) {
  const [values, setValues] = useState<PayslipUploadInput>({ employeeId: "", period: "" })
  const [file, setFile] = useState<File | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const employees = usePayslipEmployeeOptions(open)
  const upload = useUploadPayslip()
  const options = employees.data ?? []

  function update<Key extends keyof PayslipUploadInput>(key: Key, value: PayslipUploadInput[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = payslipUploadSchema.safeParse(values)
    const fileError = !file
      ? "Choose a payslip PDF."
      : file.size > MAX_PAYSLIP_BYTES
        ? "Payslips can be at most 10 MB."
        : null
    if (!parsed.success || fileError) {
      setFieldErrors({
        ...(parsed.success ? {} : z.flattenError(parsed.error).fieldErrors),
        ...(fileError ? { file: [fileError] } : {}),
      })
      return
    }
    if (!file) return
    upload.mutate({ input: parsed.data, file }, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !upload.isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Upload payslip</DialogTitle>
            <DialogDescription>The employee can open it from the Payslips page of their Employee hub.</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field data-invalid={Boolean(fieldErrors.employeeId)}>
              <FieldLabel htmlFor="payslip-employee">Employee</FieldLabel>
              <Select
                value={values.employeeId || null}
                onValueChange={(next) => update("employeeId", (next as string | null) ?? "")}
                items={options.map((option) => ({ label: option.name, value: option.id }))}
                disabled={employees.isPending}
              >
                <SelectTrigger id="payslip-employee" className="w-full" aria-invalid={Boolean(fieldErrors.employeeId)}>
                  <SelectValue placeholder={employees.isPending ? "Loading…" : "Choose an employee"} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {employees.isError && (
                <FieldDescription className="text-destructive">
                  Employees couldn&apos;t be loaded. Close and try again.
                </FieldDescription>
              )}
              {employees.isSuccess && options.length === 0 && (
                <FieldDescription>This cluster has no active employees.</FieldDescription>
              )}
              <FieldError errors={fieldErrors.employeeId?.map((message) => ({ message }))} />
            </Field>

            <Field data-invalid={Boolean(fieldErrors.period)}>
              <FieldLabel htmlFor="payslip-period">Period</FieldLabel>
              <Input
                id="payslip-period"
                type="month"
                value={values.period}
                onChange={(event) => update("period", event.target.value)}
                placeholder="YYYY-MM"
                aria-invalid={Boolean(fieldErrors.period)}
              />
              <FieldError errors={fieldErrors.period?.map((message) => ({ message }))} />
            </Field>

            <Field data-invalid={Boolean(fieldErrors.file)}>
              <FieldLabel htmlFor="payslip-file">Payslip PDF</FieldLabel>
              <Input
                id="payslip-file"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null)
                  setFieldErrors((current) => ({ ...current, file: undefined }))
                }}
                aria-invalid={Boolean(fieldErrors.file)}
              />
              <FieldDescription>PDF only, up to 10 MB.</FieldDescription>
              <FieldError errors={fieldErrors.file?.map((message) => ({ message }))} />
            </Field>
          </FieldGroup>

          {upload.isError && (
            <p role="alert" className="text-sm text-destructive">
              {upload.error.message}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={upload.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={upload.isPending}>
              {upload.isPending && <Loader2Icon className="animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
