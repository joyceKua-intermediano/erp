"use client"

import { useState, type FormEvent, type ReactNode } from "react"
import { Loader2Icon } from "lucide-react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIndustryFieldOptions, useSaveCompany } from "@/hooks/use-companies"
import {
  NEW_INDUSTRY_VALUE,
  companyFormSchema,
  toCompanyFormInput,
  type Company,
  type CompanyFormInput,
} from "@/lib/companies"

type FieldErrors = Partial<Record<keyof CompanyFormInput, string[]>>

type TextFieldKey = Exclude<keyof CompanyFormInput, "industryFieldId" | "isCustomer">

type CompanyFormSheetProps = {
  open: boolean
  company: Company | null
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
              ? `Update the details for ${company.name}.`
              : "Register a client or prospect company. Contacts are added from its detail page."}
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

function CompanyForm({ company, onDone }: { company: Company | null; onDone: () => void }) {
  const [values, setValues] = useState<CompanyFormInput>(() => toCompanyFormInput(company))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const industryOptions = useIndustryFieldOptions()
  const saveCompany = useSaveCompany()
  const industries = industryOptions.data ?? []
  // Keep an archived industry selectable when editing a company that still uses it.
  const industryItems = [
    ...industries.map((industry) => ({ label: industry.name, value: industry.id })),
    ...(company?.industryFieldId &&
    company.industryName &&
    !industries.some((industry) => industry.id === company.industryFieldId)
      ? [{ label: company.industryName, value: company.industryFieldId }]
      : []),
  ]
  const isNewIndustry = values.industryFieldId === NEW_INDUSTRY_VALUE

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
    key: TextFieldKey,
    label: string,
    options: { placeholder?: string; type?: string; inputMode?: "numeric"; description?: string }
  ) {
    const id = `company-${key}`
    return (
      <Field data-invalid={Boolean(fieldErrors[key])}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Input
          id={id}
          type={options.type}
          inputMode={options.inputMode}
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
        <FormSection title="Company" description="Its legal name and identifiers.">
          <FieldGroup className="gap-4">
            {textField("name", "Company name", {
              placeholder: "Acme Logistics",
              description: "Must be unique among active companies.",
            })}
            {textField("website", "Website", { placeholder: "https://acme.com", type: "url" })}
            <div className="grid gap-4 sm:grid-cols-2">
              {textField("taxId", "Tax ID", { placeholder: "Company tax number" })}
              {textField("vat", "VAT", { placeholder: "VAT number" })}
            </div>
          </FieldGroup>
        </FormSection>

        <FormSection title="Location" description="Where the company is based.">
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {textField("country", "Country", { placeholder: "Colombia" })}
              {textField("state", "State", { placeholder: "State or province" })}
              {textField("city", "City", { placeholder: "Bogotá" })}
              {textField("postalCode", "Postal code", { placeholder: "110111" })}
            </div>
            {textField("address", "Address", { placeholder: "Street, number and suite" })}
          </FieldGroup>
        </FormSection>

        <FormSection title="Business" description="Industry, size and whether they're already a customer.">
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(fieldErrors.industryFieldId)}>
                <FieldLabel htmlFor="company-industryFieldId">Field of industry</FieldLabel>
                <Select
                  value={values.industryFieldId || null}
                  onValueChange={(value) => update("industryFieldId", (value as string | null) ?? "")}
                  items={[...industryItems, { label: "New industry…", value: NEW_INDUSTRY_VALUE }]}
                  disabled={industryOptions.isPending || industryOptions.isError}
                >
                  <SelectTrigger
                    id="company-industryFieldId"
                    className="w-full"
                    aria-invalid={Boolean(fieldErrors.industryFieldId)}
                  >
                    <SelectValue placeholder={industryOptions.isPending ? "Loading industries…" : "Choose an industry"} />
                  </SelectTrigger>
                  <SelectContent>
                    {industryItems.map((industry) => (
                      <SelectItem key={industry.value} value={industry.value}>
                        {industry.label}
                      </SelectItem>
                    ))}
                    {industryItems.length > 0 && <SelectSeparator />}
                    <SelectItem value={NEW_INDUSTRY_VALUE}>New industry…</SelectItem>
                  </SelectContent>
                </Select>
                {industryOptions.isError && (
                  <FieldDescription>Industries couldn&apos;t be loaded. Close and try again.</FieldDescription>
                )}
                <FieldError errors={errorsFor("industryFieldId")} />
              </Field>
              {textField("numberOfEmployees", "Number of employees", { placeholder: "250", inputMode: "numeric" })}
            </div>
            {isNewIndustry &&
              textField("newIndustryName", "New industry name", {
                placeholder: "Renewable energy",
                description: "Added to the industry list when you save. An existing industry with this name is reused.",
              })}
            <FieldLabel htmlFor="company-isCustomer">
              <Field orientation="horizontal">
                <Checkbox
                  id="company-isCustomer"
                  checked={values.isCustomer}
                  onCheckedChange={(checked) => update("isCustomer", checked)}
                />
                <FieldContent>
                  <FieldTitle>Customer</FieldTitle>
                  <FieldDescription>Leave unchecked for prospects that haven&apos;t signed yet.</FieldDescription>
                </FieldContent>
              </Field>
            </FieldLabel>
          </FieldGroup>
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
