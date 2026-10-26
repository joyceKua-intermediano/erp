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
import { useContractFormOptions, useSaveContract } from "@/hooks/use-contracts"
import {
  contractFormSchema,
  salaryModeLabels,
  salaryModes,
  toContractFormInput,
  type ContractDetail,
  type ContractFormInput,
  type ContractOption,
} from "@/lib/contracts"

type FieldErrors = Partial<Record<keyof ContractFormInput, string[]>>

const NO_TEMPLATE = "none"

type ContractFormSheetProps = {
  open: boolean
  contract: ContractDetail | null
  clusterLabel: string
  formKey: number
  onOpenChange: (open: boolean) => void
}

export function ContractFormSheet({ open, contract, clusterLabel, formKey, onOpenChange }: ContractFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-2xl">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>{contract ? "Edit contract" : "Add employee contract"}</SheetTitle>
          <SheetDescription>
            {contract
              ? `Update ${contract.employeeName}'s contract under ${clusterLabel}.`
              : `Create an employee contract under ${clusterLabel}. Signatures are collected after it's saved.`}
          </SheetDescription>
        </SheetHeader>
        <ContractForm key={formKey} contract={contract} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}

// Keeps the saved value selectable even when it no longer appears in the current options.
function withCurrent(options: ContractOption[], currentId: string | null, currentName: string | null) {
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

function ContractForm({ contract, onDone }: { contract: ContractDetail | null; onDone: () => void }) {
  const [values, setValues] = useState<ContractFormInput>(() => toContractFormInput(contract))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const formOptions = useContractFormOptions()
  const saveContract = useSaveContract()
  const options = formOptions.data
  const optionsUnavailable = formOptions.isPending || formOptions.isError

  const effectiveValues: ContractFormInput = {
    ...values,
    countryId: values.countryId || options?.clusterCountryId || "",
  }

  const employees = withCurrent(options?.employees ?? [], contract?.employeeId ?? null, contract?.employeeName ?? null)
  const companies = withCurrent(options?.companies ?? [], contract?.companyId ?? null, contract?.companyName ?? null)
  const countries = withCurrent(options?.countries ?? [], contract?.countryId ?? null, contract?.countryName ?? null)
  const templates = withCurrent(options?.templates ?? [], contract?.templateId ?? null, contract?.templateName ?? null)

  function update<Key extends keyof ContractFormInput>(key: Key, value: ContractFormInput[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  function errorsFor(key: keyof ContractFormInput) {
    return fieldErrors[key]?.map((message) => ({ message }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = contractFormSchema.safeParse(effectiveValues)
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors)
      return
    }
    saveContract.mutate({ contractId: contract?.id ?? null, input: effectiveValues }, { onSuccess: onDone })
  }

  function selectField(
    key: "employeeId" | "companyId" | "countryId" | "templateId",
    label: string,
    items: { label: string; value: string }[],
    config: { placeholder: string; description?: string; emptyValue?: string }
  ) {
    const id = `contract-${key}`
    const currentValue = effectiveValues[key] || config.emptyValue || null
    return (
      <Field data-invalid={Boolean(fieldErrors[key])}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Select
          value={currentValue}
          onValueChange={(value) => {
            const next = (value as string | null) ?? ""
            update(key, next === config.emptyValue ? "" : next)
          }}
          items={items}
          disabled={optionsUnavailable}
        >
          <SelectTrigger id={id} className="w-full" aria-invalid={Boolean(fieldErrors[key])}>
            <SelectValue placeholder={formOptions.isPending ? "Loading…" : config.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {config.description && <FieldDescription>{config.description}</FieldDescription>}
        <FieldError errors={errorsFor(key)} />
      </Field>
    )
  }

  function textField(
    key: "jobTitle" | "translatedPosition" | "startDate" | "endDate" | "grossSalary",
    label: string,
    config: { placeholder?: string; type?: string; inputMode?: "decimal"; description?: string }
  ) {
    const id = `contract-${key}`
    return (
      <Field data-invalid={Boolean(fieldErrors[key])}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Input
          id={id}
          type={config.type}
          inputMode={config.inputMode}
          value={values[key]}
          onChange={(event) => update(key, event.target.value)}
          placeholder={config.placeholder}
          autoComplete="off"
          aria-invalid={Boolean(fieldErrors[key])}
        />
        {config.description && <FieldDescription>{config.description}</FieldDescription>}
        <FieldError errors={errorsFor(key)} />
      </Field>
    )
  }

  function textareaField(key: "jobDescription" | "translatedJobDescription", label: string, placeholder: string) {
    const id = `contract-${key}`
    return (
      <Field data-invalid={Boolean(fieldErrors[key])}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Textarea
          id={id}
          value={values[key]}
          onChange={(event) => update(key, event.target.value)}
          placeholder={placeholder}
          className="min-h-28"
          aria-invalid={Boolean(fieldErrors[key])}
        />
        <FieldError errors={errorsFor(key)} />
      </Field>
    )
  }

  const toItems = (rows: ContractOption[]) => rows.map((row) => ({ label: row.name, value: row.id }))

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto" noValidate>
      <div className="flex flex-col gap-8 px-6 py-6">
        {formOptions.isError && (
          <p role="alert" className="text-sm text-destructive">
            The form options couldn&apos;t be loaded. Close the form and try again.
          </p>
        )}

        <FormSection title="Parties">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            {selectField("employeeId", "Employee", toItems(employees), {
              placeholder: "Choose an employee",
              description: "Only employees in this cluster are listed.",
            })}
            {selectField("companyId", "Client company", toItems(companies), {
              placeholder: "Choose a client",
              description: "Companies marked as customers.",
            })}
          </FieldGroup>
        </FormSection>

        <FormSection title="Position">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            {textField("jobTitle", "Job title", { placeholder: "Operations Analyst" })}
            {textField("translatedPosition", "Translated position", { placeholder: "Analista de Operaciones" })}
            {selectField("countryId", "Country of work", toItems(countries), { placeholder: "Choose a country" })}
            {selectField("templateId", "PDF template", [{ label: "No template", value: NO_TEMPLATE }, ...toItems(templates)], {
              placeholder: "No template",
              emptyValue: NO_TEMPLATE,
              description: "Templates for this cluster or its country.",
            })}
          </FieldGroup>
        </FormSection>

        <FormSection title="Terms">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            {textField("startDate", "Start date", { type: "date" })}
            {textField("endDate", "End date", { type: "date", description: "Leave empty for an open-ended contract." })}
            {textField("grossSalary", "Gross salary", { placeholder: "6500000.00", inputMode: "decimal" })}
            {options?.showsSalaryMode && (
              <Field>
                <FieldLabel htmlFor="contract-salaryMode">Salary mode</FieldLabel>
                <Select
                  value={values.salaryMode}
                  onValueChange={(value) => update("salaryMode", (value as ContractFormInput["salaryMode"]) ?? "ordinary")}
                  items={salaryModes.map((mode) => ({ label: salaryModeLabels[mode], value: mode }))}
                >
                  <SelectTrigger id="contract-salaryMode" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {salaryModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {salaryModeLabels[mode]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </FieldGroup>
        </FormSection>

        <FormSection title="Job description">
          <FieldGroup className="gap-4">
            {textareaField("jobDescription", "Job description", "Main responsibilities, in the contract's language")}
            {textareaField("translatedJobDescription", "Translated job description", "The same description, translated")}
          </FieldGroup>
        </FormSection>
      </div>

      <SheetFooter className="mt-auto border-t px-6 py-4">
        {saveContract.isError && (
          <p role="alert" className="text-sm text-destructive">
            {saveContract.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone} disabled={saveContract.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={saveContract.isPending || optionsUnavailable}>
            {saveContract.isPending && <Loader2Icon className="animate-spin" />}
            {contract ? "Save changes" : "Add contract"}
          </Button>
        </div>
      </SheetFooter>
    </form>
  )
}
