"use client"

import { useState, type FormEvent } from "react"
import { Building2Icon, HandshakeIcon, Loader2Icon } from "lucide-react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useCustomerAccountOptions, useSaveCustomerAccount } from "@/hooks/use-customer-accounts"
import {
  customerAccountFormSchema,
  passwordResetSchema,
  type CustomerAccount,
  type CustomerAccountFormInput,
  type CustomerAccountOption,
  type CustomerAccountType,
} from "@/lib/customer-accounts"
import { PasswordField } from "./password-field"

type FieldErrors = Partial<Record<keyof CustomerAccountFormInput | "password", string[]>>

type CustomerAccountFormSheetProps = {
  open: boolean
  account: CustomerAccount | null
  formKey: number
  // Set when adding from a company page, so the account can only belong to that company.
  lockedCompany?: CustomerAccountOption
  onOpenChange: (open: boolean) => void
}

export function CustomerAccountFormSheet({ open, account, formKey, lockedCompany, onOpenChange }: CustomerAccountFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>{account ? "Edit portal account" : "Add portal account"}</SheetTitle>
          <SheetDescription>
            {account
              ? "Update who this account belongs to and the email they sign in with."
              : "Let someone at a client company sign in to the Client portal to review contracts and approvals."}
          </SheetDescription>
        </SheetHeader>
        <CustomerAccountForm
          key={formKey}
          account={account}
          lockedCompany={lockedCompany}
          onDone={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  )
}

function OptionSelect({
  id,
  value,
  options,
  placeholder,
  isLoading,
  invalid,
  onChange,
}: {
  id: string
  value: string
  options: CustomerAccountOption[]
  placeholder: string
  isLoading: boolean
  invalid: boolean
  onChange: (value: string) => void
}) {
  return (
    <Select
      value={value || null}
      onValueChange={(next) => onChange((next as string | null) ?? "")}
      items={options.map((option) => ({ label: option.name, value: option.id }))}
      disabled={isLoading}
    >
      <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
        <SelectValue placeholder={isLoading ? "Loading…" : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function CustomerAccountForm({
  account,
  lockedCompany,
  onDone,
}: {
  account: CustomerAccount | null
  lockedCompany?: CustomerAccountOption
  onDone: () => void
}) {
  const [values, setValues] = useState<CustomerAccountFormInput>({
    type: account?.type ?? "company",
    companyId: account?.companyId ?? lockedCompany?.id ?? "",
    partnerId: account?.partnerId ?? "",
    name: account?.name ?? "",
    email: account?.email ?? "",
  })
  const [password, setPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const options = useCustomerAccountOptions(!lockedCompany)
  const saveAccount = useSaveCustomerAccount()
  const isCreating = account === null

  function update<Key extends keyof CustomerAccountFormInput>(key: Key, value: CustomerAccountFormInput[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedAccount = customerAccountFormSchema.safeParse(values)
    const parsedPassword = isCreating ? passwordResetSchema.safeParse({ password }) : null
    if (!parsedAccount.success || (parsedPassword && !parsedPassword.success)) {
      setFieldErrors({
        ...(parsedAccount.success ? {} : z.flattenError(parsedAccount.error).fieldErrors),
        ...(parsedPassword && !parsedPassword.success ? z.flattenError(parsedPassword.error).fieldErrors : {}),
      })
      return
    }
    saveAccount.mutate({ accountId: account?.id ?? null, account: values, password }, { onSuccess: onDone })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto" noValidate>
      <FieldGroup className="px-6 py-6">
        {lockedCompany ? (
          <Field>
            <FieldLabel>Company</FieldLabel>
            <p className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <Building2Icon className="size-4 text-primary" />
              {lockedCompany.name}
            </p>
          </Field>
        ) : (
          <>
            <Field>
              <FieldLabel>Account for</FieldLabel>
              <ToggleGroup
                variant="outline"
                spacing={0}
                value={[values.type]}
                onValueChange={(next) => {
                  const type = next[0] as CustomerAccountType | undefined
                  if (type) update("type", type)
                }}
                aria-label="Account type"
                className="w-full"
              >
                <ToggleGroupItem value="company" className="flex-1">
                  <Building2Icon />
                  Company
                </ToggleGroupItem>
                <ToggleGroupItem value="partner" className="flex-1">
                  <HandshakeIcon />
                  Partner
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>

            {values.type === "company" ? (
              <Field data-invalid={Boolean(fieldErrors.companyId)}>
                <FieldLabel htmlFor="portal-account-company">Company</FieldLabel>
                <OptionSelect
                  id="portal-account-company"
                  value={values.companyId}
                  options={options.data?.companies ?? []}
                  placeholder="Choose a company"
                  isLoading={options.isPending}
                  invalid={Boolean(fieldErrors.companyId)}
                  onChange={(value) => update("companyId", value)}
                />
                <FieldError errors={fieldErrors.companyId?.map((message) => ({ message }))} />
              </Field>
            ) : (
              <Field data-invalid={Boolean(fieldErrors.partnerId)}>
                <FieldLabel htmlFor="portal-account-partner">Partner</FieldLabel>
                <OptionSelect
                  id="portal-account-partner"
                  value={values.partnerId}
                  options={options.data?.partners ?? []}
                  placeholder="Choose a partner"
                  isLoading={options.isPending}
                  invalid={Boolean(fieldErrors.partnerId)}
                  onChange={(value) => update("partnerId", value)}
                />
                <FieldDescription>
                  Partner accounts can sign in to the legacy portal only; the new Client portal is for companies for now.
                </FieldDescription>
                <FieldError errors={fieldErrors.partnerId?.map((message) => ({ message }))} />
              </Field>
            )}
            {options.isError && (
              <p className="text-sm text-destructive">Companies and partners couldn&apos;t be loaded. Close and try again.</p>
            )}
          </>
        )}

        <Field data-invalid={Boolean(fieldErrors.name)}>
          <FieldLabel htmlFor="portal-account-name">Full name</FieldLabel>
          <Input
            id="portal-account-name"
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Ana Souza"
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors.name)}
          />
          <FieldError errors={fieldErrors.name?.map((message) => ({ message }))} />
        </Field>

        <Field data-invalid={Boolean(fieldErrors.email)}>
          <FieldLabel htmlFor="portal-account-email">Email</FieldLabel>
          <Input
            id="portal-account-email"
            type="email"
            value={values.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="ana.souza@client.com"
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors.email)}
          />
          <FieldDescription>They sign in with this email and the password you set.</FieldDescription>
          <FieldError errors={fieldErrors.email?.map((message) => ({ message }))} />
        </Field>

        {isCreating && (
          <PasswordField
            id="portal-account-password"
            label="Password"
            value={password}
            onChange={(value) => {
              setPassword(value)
              setFieldErrors((current) => ({ ...current, password: undefined }))
            }}
            errors={fieldErrors.password}
          />
        )}
      </FieldGroup>

      <SheetFooter className="border-t px-6 py-4">
        {saveAccount.isError && (
          <p role="alert" className="text-sm text-destructive">
            {saveAccount.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone} disabled={saveAccount.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={saveAccount.isPending}>
            {saveAccount.isPending && <Loader2Icon className="animate-spin" />}
            {isCreating ? "Add account" : "Save changes"}
          </Button>
        </div>
      </SheetFooter>
    </form>
  )
}
