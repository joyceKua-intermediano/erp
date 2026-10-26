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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useSaveContact } from "@/hooks/use-companies"
import {
  contactFormSchema,
  toContactFormInput,
  type CompanyContact,
  type ContactFormInput,
} from "@/lib/companies"

type FieldErrors = Partial<Record<keyof ContactFormInput, string[]>>

type ContactFormSheetProps = {
  open: boolean
  companyId: string
  companyName: string
  contact: CompanyContact | null
  formKey: number
  onOpenChange: (open: boolean) => void
}

export function ContactFormSheet({ open, companyId, companyName, contact, formKey, onOpenChange }: ContactFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>{contact ? "Edit contact" : "Add contact"}</SheetTitle>
          <SheetDescription>
            {contact ? `Update the details for ${contact.fullName}.` : `Add a person the team works with at ${companyName}.`}
          </SheetDescription>
        </SheetHeader>
        <ContactForm key={formKey} companyId={companyId} contact={contact} onDone={() => onOpenChange(false)} />
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

function ContactForm({
  companyId,
  contact,
  onDone,
}: {
  companyId: string
  contact: CompanyContact | null
  onDone: () => void
}) {
  const [values, setValues] = useState<ContactFormInput>(() => toContactFormInput(contact))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const saveContact = useSaveContact(companyId)

  function update<Key extends keyof ContactFormInput>(key: Key, value: ContactFormInput[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = contactFormSchema.safeParse(values)
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors)
      return
    }
    saveContact.mutate({ contactId: contact?.id ?? null, input: values }, { onSuccess: onDone })
  }

  function textField(
    key: Exclude<keyof ContactFormInput, "isMainContact">,
    label: string,
    options: { placeholder?: string; type?: string }
  ) {
    const id = `contact-${key}`
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
        <FieldError errors={fieldErrors[key]?.map((message) => ({ message }))} />
      </Field>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto" noValidate>
      <div className="flex flex-col gap-8 px-6 py-6">
        <FormSection title="Person" description="Who they are and their role at the company.">
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {textField("contactName", "First name", { placeholder: "Rachel" })}
              {textField("surname", "Surname", { placeholder: "Stone" })}
              {textField("position", "Job title", { placeholder: "HR Director" })}
              {textField("department", "Department", { placeholder: "Human Resources" })}
            </div>
            <FieldLabel htmlFor="contact-isMainContact">
              <Field orientation="horizontal">
                <Checkbox
                  id="contact-isMainContact"
                  checked={values.isMainContact}
                  onCheckedChange={(checked) => update("isMainContact", checked)}
                />
                <FieldContent>
                  <FieldTitle>Main contact</FieldTitle>
                  <FieldDescription>Replaces the current main contact, if there is one.</FieldDescription>
                </FieldContent>
              </Field>
            </FieldLabel>
          </FieldGroup>
        </FormSection>

        <FormSection title="Contact" description="How the team reaches this person.">
          <FieldGroup className="gap-4">
            {textField("email", "Email", { placeholder: "rachel@acme.com", type: "email" })}
            <div className="grid gap-4 sm:grid-cols-2">
              {textField("mobile", "Mobile", { placeholder: "+57 300 000 0000", type: "tel" })}
              {textField("phone", "Phone", { placeholder: "+57 601 000 0000", type: "tel" })}
            </div>
            {textField("linkedin", "LinkedIn", { placeholder: "https://linkedin.com/in/…", type: "url" })}
          </FieldGroup>
        </FormSection>
      </div>

      <SheetFooter className="border-t px-6 py-4">
        {saveContact.isError && (
          <p role="alert" className="text-sm text-destructive">
            {saveContact.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone} disabled={saveContact.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={saveContact.isPending}>
            {saveContact.isPending && <Loader2Icon className="animate-spin" />}
            {contact ? "Save changes" : "Add contact"}
          </Button>
        </div>
      </SheetFooter>
    </form>
  )
}
