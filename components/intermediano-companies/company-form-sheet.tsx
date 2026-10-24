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
import { useCountryOptions, useSaveIntermedianoCompany } from "@/hooks/use-clusters"
import {
  companyFormSchema,
  toCompanyFormInput,
  type CompanyFormInput,
  type IntermedianoCompany,
} from "@/lib/intermediano-companies"

type FieldErrors = Partial<Record<keyof CompanyFormInput, string[]>>

type CompanyFormSheetProps = {
  open: boolean
  company: IntermedianoCompany | null
  formKey: number
  onOpenChange: (open: boolean) => void
}

export function CompanyFormSheet({ open, company, formKey, onOpenChange }: CompanyFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>{company ? "Edit company" : "Add company"}</SheetTitle>
          <SheetDescription>
            {company
              ? `Update the legal and contact details for ${company.name}.`
              : "Register a new Intermediano legal entity. It becomes a cluster people can work in."}
          </SheetDescription>
        </SheetHeader>
        <CompanyForm key={formKey} company={company} onDone={() => onOpenChange(false)} />
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

function CompanyForm({ company, onDone }: { company: IntermedianoCompany | null; onDone: () => void }) {
  const [values, setValues] = useState<CompanyFormInput>(() => toCompanyFormInput(company))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const countryOptions = useCountryOptions()
  const saveCompany = useSaveIntermedianoCompany()
  const countries = countryOptions.data ?? []

  function update<Key extends keyof CompanyFormInput>(key: Key, value: CompanyFormInput[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  function errorsFor(key: keyof CompanyFormInput) {
    return fieldErrors[key]?.map((message) => ({ message }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = companyFormSchema.safeParse(values)
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors)
      return
    }
    saveCompany.mutate({ companyId: company?.id ?? null, input: values }, { onSuccess: onDone })
  }

  function textField(
    key: Exclude<keyof CompanyFormInput, "countryId">,
    label: string,
    options: { placeholder: string; type?: string; description?: string }
  ) {
    const id = `company-${key}`
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
        <FormSection title="Company" description="The legal entity as it appears on contracts and invoices.">
          <FieldGroup className="gap-4">
            {textField("name", "Legal name", { placeholder: "Intermediano Mexico S.A. de C.V." })}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(fieldErrors.countryId)}>
                <FieldLabel htmlFor="company-countryId">Country</FieldLabel>
                <Select
                  value={values.countryId || null}
                  onValueChange={(value) => update("countryId", (value as string | null) ?? "")}
                  items={countries.map((country) => ({ label: country.name, value: country.id }))}
                  disabled={countryOptions.isPending || countryOptions.isError}
                >
                  <SelectTrigger
                    id="company-countryId"
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
              {textField("taxId", "Tax ID", { placeholder: "NIT, CNPJ, BN…" })}
            </div>
          </FieldGroup>
        </FormSection>

        <FormSection title="Main contact" description="Who the team reaches out to about this entity.">
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {textField("contactName", "Contact name", { placeholder: "Laura Gomez" })}
              {textField("mobileNumber", "Mobile number", { placeholder: "+52 55 0000 0000", type: "tel" })}
            </div>
            {textField("email", "Email", { placeholder: "mexico@intermediano.com", type: "email" })}
          </FieldGroup>
        </FormSection>

        <FormSection title="Address" description="Registered office address.">
          {textField("address", "Street address", {
            placeholder: "Av. Reforma 222, Ciudad de Mexico",
            description: "Include street, number and city.",
          })}
        </FormSection>
      </div>

      <SheetFooter className="border-t px-6 py-4">
        {saveCompany.isError && (
          <p role="alert" className="text-sm text-destructive">
            {saveCompany.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone} disabled={saveCompany.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={saveCompany.isPending}>
            {saveCompany.isPending && <Loader2Icon className="animate-spin" />}
            {company ? "Save changes" : "Add company"}
          </Button>
        </div>
      </SheetFooter>
    </form>
  )
}
