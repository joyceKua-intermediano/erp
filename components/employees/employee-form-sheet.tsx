"use client"

import { useState, type FormEvent } from "react"
import { Loader2Icon } from "lucide-react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useConsultantOptions, useSaveEmployee } from "@/hooks/use-employees"
import {
  employeeFormSchema,
  toEmployeeFormInput,
  type EmployeeDetail,
  type EmployeeFormInput,
} from "@/lib/employees"

type FieldErrors = Partial<Record<keyof EmployeeFormInput, string[]>>

const NO_CONSULTANT = "none"

type EmployeeFormSheetProps = {
  open: boolean
  employee: EmployeeDetail | null
  clusterLabel: string
  formKey: number
  onOpenChange: (open: boolean) => void
}

export function EmployeeFormSheet({ open, employee, clusterLabel, formKey, onOpenChange }: EmployeeFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>{employee ? "Edit employee" : "Add employee"}</SheetTitle>
          <SheetDescription>
            {employee
              ? `Update the basic details for ${employee.name}.`
              : `Add a new employee to ${clusterLabel}. They can't sign in to the employee portal until they're invited.`}
          </SheetDescription>
        </SheetHeader>
        <EmployeeForm key={formKey} employee={employee} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}

function EmployeeForm({ employee, onDone }: { employee: EmployeeDetail | null; onDone: () => void }) {
  const [values, setValues] = useState<EmployeeFormInput>(() => toEmployeeFormInput(employee))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const consultantOptions = useConsultantOptions()
  const saveEmployee = useSaveEmployee()
  const consultants = consultantOptions.data ?? []
  const currentConsultant =
    employee?.consultantId && employee.consultantName
      ? [{ id: employee.consultantId, name: employee.consultantName }]
      : []
  const consultantItems = [
    { label: "No consultant", value: NO_CONSULTANT },
    ...[...currentConsultant, ...consultants.filter((consultant) => consultant.id !== employee?.consultantId)].map(
      (consultant) => ({ label: consultant.name, value: consultant.id })
    ),
  ]

  function update<Key extends keyof EmployeeFormInput>(key: Key, value: EmployeeFormInput[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  function errorsFor(key: keyof EmployeeFormInput) {
    return fieldErrors[key]?.map((message) => ({ message }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = employeeFormSchema.safeParse(values)
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors)
      return
    }
    saveEmployee.mutate({ employeeId: employee?.id ?? null, input: values }, { onSuccess: onDone })
  }

  function textField(key: "name" | "email", label: string, options: { placeholder: string; type?: string }) {
    const id = `employee-${key}`
    return (
      <Field data-invalid={Boolean(fieldErrors[key])}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Input
          id={id}
          type={options.type}
          value={values[key]}
          onChange={(event) => update(key, event.target.value)}
          placeholder={options.placeholder}
          autoComplete="off"
          aria-invalid={Boolean(fieldErrors[key])}
        />
        <FieldError errors={errorsFor(key)} />
      </Field>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto" noValidate>
      <div className="flex flex-col gap-8 px-6 py-6">
        <FieldGroup className="gap-4">
          {textField("name", "Full name", { placeholder: "Maria Fernanda Lopez" })}
          {textField("email", "Email", { placeholder: "maria.lopez@example.com", type: "email" })}
          <Field data-invalid={Boolean(fieldErrors.consultantId)}>
            <FieldLabel htmlFor="employee-consultantId">Consultant</FieldLabel>
            <Select
              value={values.consultantId || NO_CONSULTANT}
              onValueChange={(value) => {
                const next = (value as string | null) ?? NO_CONSULTANT
                update("consultantId", next === NO_CONSULTANT ? "" : next)
              }}
              items={consultantItems}
              disabled={consultantOptions.isPending || consultantOptions.isError}
            >
              <SelectTrigger
                id="employee-consultantId"
                className="w-full"
                aria-invalid={Boolean(fieldErrors.consultantId)}
              >
                <SelectValue placeholder={consultantOptions.isPending ? "Loading consultants…" : "No consultant"} />
              </SelectTrigger>
              <SelectContent>
                {consultantItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {consultantOptions.isError ? (
              <FieldDescription>Consultants couldn&apos;t be loaded. Close and try again.</FieldDescription>
            ) : (
              <FieldDescription>Only consultants in this cluster&apos;s country are listed.</FieldDescription>
            )}
            <FieldError errors={errorsFor("consultantId")} />
          </Field>
        </FieldGroup>
      </div>

      <SheetFooter className="border-t px-6 py-4">
        {saveEmployee.isError && (
          <p role="alert" className="text-sm text-destructive">
            {saveEmployee.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone} disabled={saveEmployee.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={saveEmployee.isPending}>
            {saveEmployee.isPending && <Loader2Icon className="animate-spin" />}
            {employee ? "Save changes" : "Add employee"}
          </Button>
        </div>
      </SheetFooter>
    </form>
  )
}
