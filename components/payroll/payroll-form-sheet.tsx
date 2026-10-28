"use client"

import { useState, type FormEvent } from "react"
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react"
import { z } from "zod"
import {
  ChoiceField,
  FormSection,
  QuotationFields,
  withCurrent,
} from "@/components/quotations/quotation-form-sheet"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { usePayrollFormOptions, useSavePayroll } from "@/hooks/use-payroll"
import {
  allowedProvisionTypes,
  payrollFormSchema,
  toPayrollFormInput,
  type PayrollDetail,
  type PayrollFormInput,
  type PayrollProvisionInput,
} from "@/lib/payroll"
import { formatQuotationTitle, quotationFields, type QuotationFormInput, type QuotationOption } from "@/lib/quotations"

type FieldErrors = Partial<Record<keyof PayrollFormInput, string[]>>

type PayrollFormSheetProps = {
  open: boolean
  payroll: PayrollDetail | null
  clusterLabel: string
  formKey: number
  onOpenChange: (open: boolean) => void
}

export function PayrollFormSheet({ open, payroll, clusterLabel, formKey, onOpenChange }: PayrollFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-2xl">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>{payroll ? "Edit payroll" : "Add payroll"}</SheetTitle>
          <SheetDescription>
            {payroll
              ? `Update the ${formatQuotationTitle(payroll.title)} payroll for ${payroll.consultantName ?? payroll.companyName}.`
              : `Record a consultant's monthly payroll under ${clusterLabel}. The breakdown and provisions ledger are calculated after it's saved.`}
          </SheetDescription>
        </SheetHeader>
        <PayrollForm key={formKey} payroll={payroll} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}

function PayrollForm({ payroll, onDone }: { payroll: PayrollDetail | null; onDone: () => void }) {
  const [values, setValues] = useState<PayrollFormInput>(() => toPayrollFormInput(payroll))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const formOptions = usePayrollFormOptions()
  const savePayroll = useSavePayroll()
  const options = formOptions.data
  const optionsUnavailable = formOptions.isPending || formOptions.isError
  const kind = options?.kind ?? payroll?.kind ?? null
  const fields = kind ? quotationFields[kind] : null

  const companies = withCurrent(options?.companies ?? [], payroll?.companyId ?? null, payroll?.companyName ?? null)
  const provinces = withCurrent(options?.provinces ?? [], payroll?.provinceId ?? null, payroll?.provinceName ?? null)
  const consultants = withCurrent(
    options?.consultants ?? [],
    payroll?.consultantId ?? null,
    payroll?.consultantName ?? null
  )
  const toItems = (rows: QuotationOption[]) => rows.map((row) => ({ label: row.name, value: row.id }))

  // Colombia's integral payroll only pays out vacation and indemnization.
  const allowedNames = new Set(
    kind ? allowedProvisionTypes(kind, Boolean(fields?.quotationType) && values.isIntegral).map(({ name }) => name) : []
  )
  const provisionTypes = (options?.provisionTypes ?? []).filter((type) => allowedNames.has(type.name))

  function update<Key extends keyof PayrollFormInput>(key: Key, value: PayrollFormInput[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  function updateQuotationField<Key extends keyof QuotationFormInput>(key: Key, value: QuotationFormInput[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  function updateProvision(index: number, provision: Partial<PayrollProvisionInput>) {
    update(
      "provisions",
      values.provisions.map((current, position) => (position === index ? { ...current, ...provision } : current))
    )
  }

  function addProvision() {
    update("provisions", [...values.provisions, { provisionTypeId: "", amount: "" }])
  }

  function removeProvision(index: number) {
    update(
      "provisions",
      values.provisions.filter((_, position) => position !== index)
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = payrollFormSchema.safeParse(values)
    const errors: FieldErrors = parsed.success ? {} : z.flattenError(parsed.error).fieldErrors
    if (fields?.province && !values.provinceId) errors.provinceId = ["Choose a province."]
    const hasDisallowedType = values.provisions.some(
      ({ provisionTypeId }) => provisionTypeId && !provisionTypes.some((type) => type.id === provisionTypeId)
    )
    if (hasDisallowedType) errors.provisions = ["Remove the provisions this type of payroll doesn't pay out."]
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    savePayroll.mutate({ payrollId: payroll?.id ?? null, input: values }, { onSuccess: onDone })
  }

  const usedTypeIds = new Set(values.provisions.map(({ provisionTypeId }) => provisionTypeId))
  const canAddProvision = provisionTypes.some((type) => !usedTypeIds.has(type.id))

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
            Payroll for this cluster hasn&apos;t been ported to the new app yet. Use the legacy app for now.
          </p>
        )}

        <QuotationFields
          noun="payroll"
          values={values}
          fieldErrors={fieldErrors}
          fields={fields}
          companies={companies}
          provinces={provinces}
          isLoadingOptions={formOptions.isPending}
          optionsUnavailable={optionsUnavailable}
          onChange={updateQuotationField}
        >
          <ChoiceField
            id="payroll-consultantId"
            label="Consultant"
            value={values.consultantId}
            items={toItems(consultants)}
            placeholder={formOptions.isPending ? "Loading…" : "Choose a consultant"}
            disabled={optionsUnavailable}
            errors={fieldErrors.consultantId}
            onChange={(value) => update("consultantId", value)}
          />
        </QuotationFields>

        {fields && (
          <FormSection title="Payment provisions">
            <p className="-mt-2 text-sm text-muted-foreground">
              Provisions paid out to the consultant this month, in {values.currencyName.trim() || "the payroll currency"}.
              They&apos;re taken off the accrued balance.
            </p>
            {values.provisions.length > 0 && (
              <div className="flex flex-col gap-3">
                {values.provisions.map((provision, index) => {
                  const typeItems = toItems(
                    provisionTypes.filter(
                      (type) => type.id === provision.provisionTypeId || !usedTypeIds.has(type.id)
                    )
                  )
                  const amountId = `payroll-provision-${index}-amount`
                  return (
                    <div key={index} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
                      <ChoiceField
                        id={`payroll-provision-${index}-type`}
                        label="Provision type"
                        value={provision.provisionTypeId}
                        items={typeItems}
                        placeholder="Choose a provision"
                        disabled={optionsUnavailable}
                        onChange={(value) => updateProvision(index, { provisionTypeId: value })}
                      />
                      <Field>
                        <FieldLabel htmlFor={amountId}>Amount</FieldLabel>
                        <Input
                          id={amountId}
                          inputMode="decimal"
                          value={provision.amount}
                          onChange={(event) => updateProvision(index, { amount: event.target.value })}
                          placeholder="0.00"
                          autoComplete="off"
                        />
                      </Field>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove this provision"
                        onClick={() => removeProvision(index)}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
            <FieldError errors={fieldErrors.provisions?.map((message) => ({ message }))} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={addProvision}
              disabled={optionsUnavailable || !canAddProvision}
            >
              <PlusIcon />
              Add provision payment
            </Button>
          </FormSection>
        )}
      </div>

      <SheetFooter className="mt-auto border-t px-6 py-4">
        {savePayroll.isError && (
          <p role="alert" className="text-sm text-destructive">
            {savePayroll.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone} disabled={savePayroll.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={savePayroll.isPending || optionsUnavailable || !fields}>
            {savePayroll.isPending && <Loader2Icon className="animate-spin" />}
            {payroll ? "Save changes" : "Add payroll"}
          </Button>
        </div>
      </SheetFooter>
    </form>
  )
}
