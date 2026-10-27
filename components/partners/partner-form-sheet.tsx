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
import { Textarea } from "@/components/ui/textarea"
import { usePartnerCountryOptions, useSavePartner } from "@/hooks/use-partners"
import {
  isPartnerType,
  partnerFormSchema,
  partnerTypeLabels,
  partnerTypes,
  toPartnerFormInput,
  type Partner,
  type PartnerFormInput,
} from "@/lib/partners"

type FieldErrors = Partial<Record<keyof PartnerFormInput, string[]>>

type PartnerFormSheetProps = {
  open: boolean
  partner: Partner | null
  formKey: number
  onOpenChange: (open: boolean) => void
}

export function PartnerFormSheet({ open, partner, formKey, onOpenChange }: PartnerFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>{partner ? "Edit partner" : "Add partner"}</SheetTitle>
          <SheetDescription>
            {partner
              ? `Update the details for ${partner.name.replace(/\.$/, "")}.`
              : "Register a commercial or operational partner. Partners are shared by every cluster."}
          </SheetDescription>
        </SheetHeader>
        <PartnerForm key={formKey} partner={partner} onDone={() => onOpenChange(false)} />
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

function PartnerForm({ partner, onDone }: { partner: Partner | null; onDone: () => void }) {
  const [values, setValues] = useState<PartnerFormInput>(() => toPartnerFormInput(partner))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const countryOptions = usePartnerCountryOptions()
  const savePartner = useSavePartner()
  const countries = countryOptions.data ?? []

  const legacyType = partner?.partnerType && !isPartnerType(partner.partnerType) ? partner.partnerType : null
  const typeOptions = [
    ...partnerTypes.map((type) => ({ label: partnerTypeLabels[type], value: type as string })),
    ...(legacyType ? [{ label: `${legacyType} (legacy)`, value: legacyType }] : []),
  ]

  function update<Key extends keyof PartnerFormInput>(key: Key, value: PartnerFormInput[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  function errorsFor(key: keyof PartnerFormInput) {
    return fieldErrors[key]?.map((message) => ({ message }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = partnerFormSchema.safeParse(values)
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors)
      return
    }
    savePartner.mutate({ partnerId: partner?.id ?? null, input: values }, { onSuccess: onDone })
  }

  function textField(
    key: Exclude<keyof PartnerFormInput, "countryId" | "partnerType" | "address">,
    label: string,
    options: { placeholder?: string; type?: string; description?: string }
  ) {
    const id = `partner-${key}`
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
        <FormSection title="Partner" description="The partner company, where it operates and how it works with us.">
          <FieldGroup className="gap-4">
            {textField("name", "Company name", { placeholder: "Maple Staffing Inc." })}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(fieldErrors.countryId)}>
                <FieldLabel htmlFor="partner-countryId">Country</FieldLabel>
                <Select
                  value={values.countryId || null}
                  onValueChange={(value) => update("countryId", (value as string | null) ?? "")}
                  items={countries.map((country) => ({ label: country.name, value: country.id }))}
                  disabled={countryOptions.isPending || countryOptions.isError}
                >
                  <SelectTrigger id="partner-countryId" className="w-full" aria-invalid={Boolean(fieldErrors.countryId)}>
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
              <Field data-invalid={Boolean(fieldErrors.partnerType)}>
                <FieldLabel htmlFor="partner-partnerType">Partner type</FieldLabel>
                <Select
                  value={values.partnerType || null}
                  onValueChange={(value) => update("partnerType", (value as string | null) ?? "")}
                  items={typeOptions}
                >
                  <SelectTrigger
                    id="partner-partnerType"
                    className="w-full"
                    aria-invalid={Boolean(fieldErrors.partnerType)}
                  >
                    <SelectValue placeholder="Choose a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={errorsFor("partnerType")} />
              </Field>
            </div>
            {textField("taxId", "Tax ID", { placeholder: "Company registration or tax number" })}
          </FieldGroup>
        </FormSection>

        <FormSection title="Contact" description="Who the team talks to at this partner.">
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {textField("contactName", "Contact name", { placeholder: "Chloe Martin" })}
              {textField("mobileNumber", "Mobile number", { placeholder: "+1 514 000 0000", type: "tel" })}
            </div>
            {textField("email", "Email", { placeholder: "ops@partner.com", type: "email" })}
          </FieldGroup>
        </FormSection>

        <FormSection title="Address" description="The partner's registered address.">
          <Field data-invalid={Boolean(fieldErrors.address)}>
            <FieldLabel htmlFor="partner-address">Address</FieldLabel>
            <Textarea
              id="partner-address"
              value={values.address}
              onChange={(event) => update("address", event.target.value)}
              placeholder="Street, number, city and postal code"
              rows={3}
              aria-invalid={Boolean(fieldErrors.address)}
            />
            <FieldError errors={errorsFor("address")} />
          </Field>
        </FormSection>
      </div>

      <SheetFooter className="border-t px-6 py-4">
        {savePartner.isError && (
          <p role="alert" className="text-sm text-destructive">
            {savePartner.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone} disabled={savePartner.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={savePartner.isPending}>
            {savePartner.isPending && <Loader2Icon className="animate-spin" />}
            {partner ? "Save changes" : "Add partner"}
          </Button>
        </div>
      </SheetFooter>
    </form>
  )
}
