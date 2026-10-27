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
import { useQuotationFormOptions, useSaveQuotation } from "@/hooks/use-quotations"
import {
  feeTypeLabels,
  feeTypes,
  formatQuotationTitle,
  quotationFields,
  quotationFormSchema,
  toQuotationFormInput,
  type FeeType,
  type QuotationDetail,
  type QuotationFormInput,
  type QuotationOption,
} from "@/lib/quotations"

type FieldErrors = Partial<Record<keyof QuotationFormInput, string[]>>

type TextKey = {
  [Key in keyof QuotationFormInput]: QuotationFormInput[Key] extends string ? Key : never
}[keyof QuotationFormInput]

type Item = { label: string; value: string }

const yesNoItems: Item[] = [
  { label: "No", value: "no" },
  { label: "Yes", value: "yes" },
]

const quotationTypeItems: Item[] = [
  { label: "Ordinary", value: "ordinary" },
  { label: "Integral", value: "integral" },
]

const feeTypeItems: Item[] = feeTypes.map((type) => ({ label: feeTypeLabels[type], value: type }))

type QuotationFormSheetProps = {
  open: boolean
  quotation: QuotationDetail | null
  clusterLabel: string
  formKey: number
  onOpenChange: (open: boolean) => void
}

export function QuotationFormSheet({ open, quotation, clusterLabel, formKey, onOpenChange }: QuotationFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-2xl">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>{quotation ? "Edit quotation" : "Add quotation"}</SheetTitle>
          <SheetDescription>
            {quotation
              ? `Update the ${formatQuotationTitle(quotation.title)} quotation for ${quotation.companyName}.`
              : `Quote a monthly payroll cost under ${clusterLabel}. The breakdown is calculated after it's saved.`}
          </SheetDescription>
        </SheetHeader>
        <QuotationForm key={formKey} quotation={quotation} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}

// Keeps the saved value selectable even when it no longer appears in the current options.
function withCurrent(options: QuotationOption[], currentId: string | null, currentName: string | null) {
  if (!currentId || !currentName || options.some((option) => option.id === currentId)) return options
  return [{ id: currentId, name: currentName }, ...options]
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-xs font-semibold tracking-wide text-primary uppercase">{title}</h3>
      {children}
    </section>
  )
}

type ChoiceFieldProps = {
  id: string
  label: string
  value: string
  items: Item[]
  placeholder?: string
  description?: string
  disabled?: boolean
  errors?: string[]
  onChange: (value: string) => void
}

function ChoiceField({ id, label, value, items, placeholder, description, disabled, errors, onChange }: ChoiceFieldProps) {
  return (
    <Field data-invalid={Boolean(errors)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        value={value || null}
        onValueChange={(next) => onChange((next as string | null) ?? "")}
        items={items}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full" aria-invalid={Boolean(errors)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={errors?.map((message) => ({ message }))} />
    </Field>
  )
}

function QuotationForm({ quotation, onDone }: { quotation: QuotationDetail | null; onDone: () => void }) {
  const [values, setValues] = useState<QuotationFormInput>(() => toQuotationFormInput(quotation))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const formOptions = useQuotationFormOptions()
  const saveQuotation = useSaveQuotation()
  const options = formOptions.data
  const optionsUnavailable = formOptions.isPending || formOptions.isError
  const kind = options?.kind ?? quotation?.kind ?? null
  const fields = kind ? quotationFields[kind] : null

  const companies = withCurrent(options?.companies ?? [], quotation?.companyId ?? null, quotation?.companyName ?? null)
  const provinces = withCurrent(options?.provinces ?? [], quotation?.provinceId ?? null, quotation?.provinceName ?? null)
  const toItems = (rows: QuotationOption[]) => rows.map((row) => ({ label: row.name, value: row.id }))

  function update<Key extends keyof QuotationFormInput>(key: Key, value: QuotationFormInput[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = quotationFormSchema.safeParse(values)
    const errors: FieldErrors = parsed.success ? {} : z.flattenError(parsed.error).fieldErrors
    if (fields?.province && !values.provinceId) errors.provinceId = ["Choose a province."]
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    saveQuotation.mutate({ quotationId: quotation?.id ?? null, input: values }, { onSuccess: onDone })
  }

  function textField(
    key: TextKey,
    label: string,
    config: { placeholder?: string; type?: string; isText?: boolean; description?: string } = {}
  ) {
    const id = `quotation-${key}`
    return (
      <Field data-invalid={Boolean(fieldErrors[key])}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Input
          id={id}
          type={config.type}
          inputMode={config.isText || config.type ? undefined : "decimal"}
          value={values[key]}
          onChange={(event) => update(key, event.target.value)}
          placeholder={config.placeholder ?? "0.00"}
          autoComplete="off"
          aria-invalid={Boolean(fieldErrors[key])}
        />
        {config.description && <FieldDescription>{config.description}</FieldDescription>}
        <FieldError errors={fieldErrors[key]?.map((message) => ({ message }))} />
      </Field>
    )
  }

  const billing = values.billingCurrency.trim() || "the billing currency"
  const isFixedFee = values.feeType === "fixed"

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto" noValidate>
      <div className="flex flex-col gap-8 px-6 py-6">
        {formOptions.isError && (
          <p role="alert" className="text-sm text-destructive">
            The form options couldn&apos;t be loaded. Close the form and try again.
          </p>
        )}
        {options && !fields && (
          <p role="alert" className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
            Quotations for this cluster haven&apos;t been ported to the new app yet. Use the legacy app for now.
          </p>
        )}

        <FormSection title="Quotation">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            {fields?.quotationType && (
              <ChoiceField
                id="quotation-isIntegral"
                label="Type of quotation"
                value={values.isIntegral ? "integral" : "ordinary"}
                items={quotationTypeItems}
                onChange={(value) => update("isIntegral", value === "integral")}
              />
            )}
            {textField("quotationDate", "Date", { type: "date", placeholder: "" })}
            <ChoiceField
              id="quotation-companyId"
              label="Customer"
              value={values.companyId}
              items={toItems(companies)}
              placeholder={formOptions.isPending ? "Loading…" : "Choose a customer"}
              disabled={optionsUnavailable}
              errors={fieldErrors.companyId}
              onChange={(value) => update("companyId", value)}
            />
            {fields?.province && (
              <ChoiceField
                id="quotation-provinceId"
                label="Province"
                value={values.provinceId}
                items={toItems(provinces)}
                placeholder={formOptions.isPending ? "Loading…" : "Choose a province"}
                description="Quebec uses its own payroll costs (QPP, QPIP, HSF, CNT, CNESST)."
                disabled={optionsUnavailable}
                errors={fieldErrors.provinceId}
                onChange={(value) => update("provinceId", value)}
              />
            )}
          </FieldGroup>
        </FormSection>

        <FormSection title="Currency">
          <FieldGroup className="grid gap-4 sm:grid-cols-3">
            {textField("currencyName", "Payroll currency", { placeholder: "COP", isText: true })}
            {textField("billingCurrency", "Billing currency", { placeholder: "USD", isText: true })}
            {textField("exchangeRate", "Exchange rate", {
              placeholder: "4100",
              description: `Payroll currency per 1 ${billing}.`,
            })}
          </FieldGroup>
        </FormSection>

        <FormSection title="Salary and fees">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            {textField("grossSalary", "Gross salary", { placeholder: "6500000.00" })}
            <ChoiceField
              id="quotation-dependent"
              label="Dependent"
              value={values.dependent ? "yes" : "no"}
              items={yesNoItems}
              onChange={(value) => update("dependent", value === "yes")}
            />
            <ChoiceField
              id="quotation-feeType"
              label="Type of fee"
              value={values.feeType}
              items={feeTypeItems}
              onChange={(value) => update("feeType", (value || "percentage") as FeeType)}
            />
            {textField("fee", isFixedFee ? `Fee (${billing})` : "Fee (%)", {
              placeholder: isFixedFee ? "500.00" : "12",
              description: isFixedFee ? "Converted with the exchange rate." : undefined,
            })}
            {textField("bankFee", `Bank fee (${billing})`, { description: "Converted with the exchange rate." })}
          </FieldGroup>
        </FormSection>

        <FormSection title="Allowances">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            {textField("bonus", "Bonus")}
            {textField("homeAllowance", "Home allowance")}
            {textField("medicalAllowance", "Medical allowance")}
            {fields?.transportAllowance && textField("transportAllowance", "Transport allowance")}
            {textField("internetAllowance", "Internet allowance")}
            {fields?.legalGratification && textField("legalGratification", "Legal gratification")}
          </FieldGroup>
        </FormSection>

        {fields?.payrollCosts && (
          <FormSection title="Payroll costs">
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              {textField("medicalInsurance", "Medical plan & life insurance")}
              {textField("meal", "Meal tickets")}
              {textField("transportation", "Transportation tickets")}
            </FieldGroup>
          </FormSection>
        )}
      </div>

      <SheetFooter className="mt-auto border-t px-6 py-4">
        {saveQuotation.isError && (
          <p role="alert" className="text-sm text-destructive">
            {saveQuotation.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone} disabled={saveQuotation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={saveQuotation.isPending || optionsUnavailable || !fields}>
            {saveQuotation.isPending && <Loader2Icon className="animate-spin" />}
            {quotation ? "Save changes" : "Add quotation"}
          </Button>
        </div>
      </SheetFooter>
    </form>
  )
}
