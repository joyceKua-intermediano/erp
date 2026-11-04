"use client"

import { useId, useState, type ReactNode } from "react"
import { CheckIcon, Loader2Icon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useMyProfile, useSaveMyProfile } from "@/hooks/use-employee-profile"
import {
  civilStatusSuggestions,
  educationAttainmentOptions,
  educationStatusOptions,
  genderSuggestions,
  MAX_DEPENDENTS,
  profileFormSchema,
  type EmployeeProfile,
  type ProfileFormInput,
} from "@/lib/employee-profile"

type Dependent = ProfileFormInput["dependents"][number]
type TextKey = {
  [Key in keyof ProfileFormInput]: ProfileFormInput[Key] extends string ? Key : never
}[keyof ProfileFormInput]

function issuesByPath(issues: { path: PropertyKey[]; message: string }[]) {
  const map = new Map<string, string>()
  for (const issue of issues) {
    const key = issue.path.map(String).join(".")
    if (!map.has(key)) map.set(key, issue.message)
  }
  return map
}

// Legacy values outside the option list stay selectable, so saving doesn't silently change them.
export function withCurrentOption(options: readonly { value: string; label: string }[], current: string) {
  return current && !options.some((option) => option.value === current)
    ? [...options, { value: current, label: current }]
    : options
}

export function FormCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <div className="grid gap-5 px-6 py-5 sm:grid-cols-2">{children}</div>
    </Card>
  )
}

export function MyProfileEditor() {
  const { data, isPending, isError, refetch } = useMyProfile()

  if (isPending) return <Skeleton className="h-96 rounded-xl" />
  if (isError) {
    return (
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">Your profile couldn&apos;t be loaded.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCwIcon />
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }
  return <MyProfileForm profile={data} />
}

function MyProfileForm({ profile }: { profile: EmployeeProfile }) {
  const fieldId = useId()
  const save = useSaveMyProfile()
  const [values, setValues] = useState<ProfileFormInput>(profile.values)
  const [showErrors, setShowErrors] = useState(false)
  const [isSaved, setSaved] = useState(false)

  const parsed = profileFormSchema.safeParse(values)
  const errors = showErrors && !parsed.success ? issuesByPath(parsed.error.issues) : new Map<string, string>()

  function update(patch: Partial<ProfileFormInput>) {
    setValues((current) => ({ ...current, ...patch }))
    setSaved(false)
  }

  function updateDependent(index: number, patch: Partial<Dependent>) {
    update({
      dependents: values.dependents.map((dependent, position) => (position === index ? { ...dependent, ...patch } : dependent)),
    })
  }

  function updateContact(patch: Partial<ProfileFormInput["emergencyContact"]>) {
    update({ emergencyContact: { ...values.emergencyContact, ...patch } })
  }

  function fieldError(path: string) {
    const message = errors.get(path)
    return message ? <FieldError errors={[{ message }]} /> : null
  }

  function textField(
    key: TextKey,
    label: string,
    options: { type?: string; list?: string; placeholder?: string; description?: string; maxLength?: number } = {},
  ) {
    const id = `${fieldId}-${key}`
    return (
      <Field data-invalid={errors.has(key)}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Input
          id={id}
          type={options.type ?? "text"}
          list={options.list}
          value={values[key] as string}
          maxLength={options.maxLength ?? 255}
          placeholder={options.placeholder}
          aria-invalid={errors.has(key)}
          onChange={(event) => update({ [key]: event.target.value } as Partial<ProfileFormInput>)}
        />
        {options.description && <FieldDescription>{options.description}</FieldDescription>}
        {fieldError(key)}
      </Field>
    )
  }

  function selectField(key: "educationAttainment" | "educationStatus", label: string, options: readonly { value: string; label: string }[]) {
    const id = `${fieldId}-${key}`
    const items = withCurrentOption(options, values[key])
    return (
      <Field data-invalid={errors.has(key)}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Select
          value={values[key] || null}
          onValueChange={(next) => update({ [key]: (next as string | null) ?? "" })}
          items={items}
        >
          <SelectTrigger id={id} className="w-full" aria-invalid={errors.has(key)}>
            <SelectValue placeholder="Choose one" />
          </SelectTrigger>
          <SelectContent>
            {items.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldError(key)}
      </Field>
    )
  }

  function handleSave() {
    setShowErrors(true)
    if (!parsed.success) return
    save.mutate(values, { onSuccess: () => setSaved(true) })
  }

  const formError = showErrors && !parsed.success ? (parsed.error.issues[0]?.message ?? null) : null

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      {!profile.hasRecord && (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          You haven&apos;t filled in your profile yet. HR uses these details for your contract and payroll.
        </p>
      )}

      <datalist id={`${fieldId}-genders`}>
        {genderSuggestions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id={`${fieldId}-civil`}>
        {civilStatusSuggestions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      <FormCard title="Personal details">
        {textField("gender", "Gender", { list: `${fieldId}-genders`, maxLength: 10, description: "Pick one or type your own." })}
        {textField("civilStatus", "Civil status", { list: `${fieldId}-civil`, description: "Pick one or type your own." })}
        {textField("dateOfBirth", "Date of birth", { type: "date" })}
        {textField("nationality", "Nationality")}
      </FormCard>

      <FormCard title="Address and contact">
        {textField("address", "Address")}
        {textField("city", "City")}
        {textField("state", "State")}
        {textField("country", "Country")}
        {textField("postalCode", "Postal code")}
        {textField("phone", "Phone", { type: "tel" })}
        {textField("mobile", "Mobile", { type: "tel" })}
      </FormCard>

      <FormCard title="Education and immigration">
        {selectField("educationAttainment", "Education attainment", educationAttainmentOptions)}
        {selectField("educationStatus", "Education status", educationStatusOptions)}
        <Field data-invalid={errors.has("expat")}>
          <FieldLabel>Expat</FieldLabel>
          <ToggleGroup
            variant="outline"
            spacing={0}
            value={values.expat ? [values.expat] : []}
            onValueChange={(next) => {
              const choice = next[0] as "yes" | "no" | undefined
              if (choice) update({ expat: choice })
            }}
            aria-label="Expat"
            className="w-full"
          >
            <ToggleGroupItem value="yes" className="flex-1">
              Yes
            </ToggleGroupItem>
            <ToggleGroupItem value="no" className="flex-1">
              No
            </ToggleGroupItem>
          </ToggleGroup>
          {fieldError("expat")}
        </Field>
        {textField("passportNumber", "Passport number")}
        {textField("workVisa", "Work visa")}
        {textField("numberOfDependents", "Number of dependents", { type: "number", maxLength: 2 })}
      </FormCard>

      <Card className="gap-0 py-0">
        <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
          <CardTitle>Dependents</CardTitle>
          <CardDescription>Family members who depend on you, for benefits and tax purposes.</CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-4 px-6 py-5">
          {values.dependents.length === 0 && <p className="text-sm text-muted-foreground">No dependents listed.</p>}
          {values.dependents.map((dependent, index) => {
            const base = `dependents.${index}`
            return (
              <div key={index} className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_10rem_1fr_auto]">
                <Field data-invalid={errors.has(`${base}.fullName`)}>
                  <FieldLabel htmlFor={`${fieldId}-${base}-name`}>Full name</FieldLabel>
                  <Input
                    id={`${fieldId}-${base}-name`}
                    value={dependent.fullName}
                    maxLength={255}
                    aria-invalid={errors.has(`${base}.fullName`)}
                    onChange={(event) => updateDependent(index, { fullName: event.target.value })}
                  />
                  {fieldError(`${base}.fullName`)}
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${fieldId}-${base}-relationship`}>Relationship</FieldLabel>
                  <Input
                    id={`${fieldId}-${base}-relationship`}
                    value={dependent.relationship}
                    maxLength={255}
                    onChange={(event) => updateDependent(index, { relationship: event.target.value })}
                  />
                </Field>
                <Field data-invalid={errors.has(`${base}.dateOfBirth`)}>
                  <FieldLabel htmlFor={`${fieldId}-${base}-dob`}>Date of birth</FieldLabel>
                  <Input
                    id={`${fieldId}-${base}-dob`}
                    type="date"
                    value={dependent.dateOfBirth}
                    onChange={(event) => updateDependent(index, { dateOfBirth: event.target.value })}
                  />
                  {fieldError(`${base}.dateOfBirth`)}
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${fieldId}-${base}-tax`}>Tax ID</FieldLabel>
                  <Input
                    id={`${fieldId}-${base}-tax`}
                    value={dependent.taxId}
                    maxLength={255}
                    onChange={(event) => updateDependent(index, { taxId: event.target.value })}
                  />
                </Field>
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => update({ dependents: values.dependents.filter((_, position) => position !== index) })}
                    aria-label={`Remove dependent ${index + 1}`}
                  >
                    <Trash2Icon />
                    Remove
                  </Button>
                </div>
              </div>
            )
          })}
          <Button
            variant="outline"
            className="w-fit"
            disabled={values.dependents.length >= MAX_DEPENDENTS}
            onClick={() =>
              update({ dependents: [...values.dependents, { fullName: "", relationship: "", dateOfBirth: "", taxId: "" }] })
            }
          >
            <PlusIcon />
            Add dependent
          </Button>
        </div>
      </Card>

      <FormCard title="Emergency contact" description="Who we should call if something happens to you at work.">
        {(
          [
            ["name", "Full name", "text"],
            ["relationship", "Relationship", "text"],
            ["mobile", "Mobile number", "tel"],
            ["email", "Email", "email"],
          ] as const
        ).map(([key, label, type]) => {
          const path = `emergencyContact.${key}`
          return (
            <Field key={key} data-invalid={errors.has(path)}>
              <FieldLabel htmlFor={`${fieldId}-${path}`}>{label}</FieldLabel>
              <Input
                id={`${fieldId}-${path}`}
                type={type}
                value={values.emergencyContact[key]}
                maxLength={255}
                aria-invalid={errors.has(path)}
                onChange={(event) => updateContact({ [key]: event.target.value })}
              />
              {fieldError(path)}
            </Field>
          )
        })}
      </FormCard>

      <div className="flex flex-col items-end gap-2">
        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
        {save.isError && (
          <p role="alert" className="text-sm text-destructive">
            {save.error.message}
          </p>
        )}
        <div className="flex items-center gap-3">
          {isSaved && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <CheckIcon className="size-4 text-primary" />
              Saved
            </span>
          )}
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending && <Loader2Icon className="animate-spin" />}
            Save profile
          </Button>
        </div>
      </div>
    </div>
  )
}
