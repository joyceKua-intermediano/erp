"use client"

import { useState, type FormEvent, type ReactNode } from "react"
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
import { useConsultantCountryOptions, useSaveConsultant } from "@/hooks/use-consultants"
import {
  consultantFormSchema,
  toConsultantFormInput,
  type Consultant,
  type ConsultantFormInput,
} from "@/lib/consultants"

type FieldErrors = Partial<Record<keyof ConsultantFormInput, string[]>>

type ConsultantFormSheetProps = {
  open: boolean
  consultant: Consultant | null
  formKey: number
  onOpenChange: (open: boolean) => void
}

export function ConsultantFormSheet({ open, consultant, formKey, onOpenChange }: ConsultantFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>{consultant ? "Edit consultant" : "Add consultant"}</SheetTitle>
          <SheetDescription>
            {consultant
              ? `Update the details for ${consultant.name}.`
              : "Register a recruitment consultant. Employees in the same country can be assigned to them."}
          </SheetDescription>
        </SheetHeader>
        <ConsultantForm key={formKey} consultant={consultant} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}

function FormSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-xs font-semibold tracking-wide text-primary uppercase">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function ConsultantForm({ consultant, onDone }: { consultant: Consultant | null; onDone: () => void }) {
  const [values, setValues] = useState<ConsultantFormInput>(() => toConsultantFormInput(consultant))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const countryOptions = useConsultantCountryOptions()
  const saveConsultant = useSaveConsultant()
  const countries = countryOptions.data ?? []

  function update<Key extends keyof ConsultantFormInput>(key: Key, value: ConsultantFormInput[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  function errorsFor(key: keyof ConsultantFormInput) {
    return fieldErrors[key]?.map((message) => ({ message }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = consultantFormSchema.safeParse(values)
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors)
      return
    }
    saveConsultant.mutate({ consultantId: consultant?.id ?? null, input: values }, { onSuccess: onDone })
  }

  function textField(
    key: Exclude<keyof ConsultantFormInput, "countryId">,
    label: string,
    options: { placeholder?: string; type?: string; description?: string }
  ) {
    const id = `consultant-${key}`
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
        {options.description && <FieldDescription>{options.description}</FieldDescription>}
        <FieldError errors={errorsFor(key)} />
      </Field>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto" noValidate>
      <div className="flex flex-col gap-8 px-6 py-6">
        <FormSection title="Consultant" description="Who they are and which country they recruit for.">
          <FieldGroup className="gap-4">
            {textField("name", "Full name", {
              placeholder: "Andrea Ramirez",
              description: "Must be unique across all consultants.",
            })}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(fieldErrors.countryId)}>
                <FieldLabel htmlFor="consultant-countryId">Country</FieldLabel>
                <Select
                  value={values.countryId || null}
                  onValueChange={(value) => update("countryId", (value as string | null) ?? "")}
                  items={countries.map((country) => ({ label: country.name, value: country.id }))}
                  disabled={countryOptions.isPending || countryOptions.isError}
                >
                  <SelectTrigger
                    id="consultant-countryId"
                    className="w-full"
                    aria-invalid={Boolean(fieldErrors.countryId)}
                  >
                    <SelectValue placeholder={countryOptions.isPending ? "Loading countries…" : "Choose a country"} />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.id} value={country.id}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {countryOptions.isError && (
                  <FieldDescription>Countries couldn&apos;t be loaded. Close and try again.</FieldDescription>
                )}
                <FieldError errors={errorsFor("countryId")} />
              </Field>
              {textField("dateOfBirth", "Date of birth", { type: "date" })}
            </div>
            {textField("employer", "Employer", { placeholder: "Agency or company they work for" })}
          </FieldGroup>
        </FormSection>

        <FormSection title="Contact" description="How the team reaches this consultant.">
          <div className="grid gap-4 sm:grid-cols-2">
            {textField("email", "Email", { placeholder: "andrea@example.com", type: "email" })}
            {textField("mobileNumber", "Mobile number", { placeholder: "+57 300 000 0000", type: "tel" })}
          </div>
        </FormSection>

        <FormSection title="Address" description="Optional mailing address.">
          {textField("address", "Address", { placeholder: "Street, number and city" })}
        </FormSection>
      </div>

      <SheetFooter className="border-t px-6 py-4">
        {saveConsultant.isError && (
          <p role="alert" className="text-sm text-destructive">
            {saveConsultant.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone} disabled={saveConsultant.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={saveConsultant.isPending}>
            {saveConsultant.isPending && <Loader2Icon className="animate-spin" />}
            {consultant ? "Save changes" : "Add consultant"}
          </Button>
        </div>
      </SheetFooter>
    </form>
  )
}
