"use client"

import { useState, type FormEvent } from "react"
import { GlobeIcon, Loader2Icon } from "lucide-react"
import { z } from "zod"
import { Badge } from "@/components/ui/badge"
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
import { useRoles } from "@/hooks/use-roles"
import { useSaveUser } from "@/hooks/use-users"
import { permissionResourceLabels, permissionResources, toAccessLevels } from "@/lib/permissions"
import type { RoleSummary } from "@/lib/roles"
import { userFormSchema, type AdminUser, type UserFormInput } from "@/lib/users"

type FieldErrors = Partial<Record<keyof UserFormInput, string[]>>

type UserFormSheetProps = {
  open: boolean
  user: AdminUser | null
  formKey: number
  onOpenChange: (open: boolean) => void
}

export function UserFormSheet({ open, user, formKey, onOpenChange }: UserFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>{user ? "Edit user" : "Add user"}</SheetTitle>
          <SheetDescription>
            {user
              ? "Update their details or move them to a different role."
              : "Give someone access to the admin console. They sign in with their Microsoft account."}
          </SheetDescription>
        </SheetHeader>
        <UserForm key={formKey} user={user} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}

function UserForm({ user, onDone }: { user: AdminUser | null; onDone: () => void }) {
  const [values, setValues] = useState<UserFormInput>({
    name: user?.name ?? "",
    email: user?.email ?? "",
    roleId: user?.roleId ?? "",
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const roles = useRoles()
  const saveUser = useSaveUser()

  const selectedRole = roles.data?.find((role) => role.id === values.roleId) ?? null

  function update<Key extends keyof UserFormInput>(key: Key, value: UserFormInput[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = userFormSchema.safeParse(values)
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors)
      return
    }
    saveUser.mutate({ userId: user?.id ?? null, input: values }, { onSuccess: onDone })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto" noValidate>
      <FieldGroup className="px-6 py-6">
        <Field data-invalid={Boolean(fieldErrors.name)}>
          <FieldLabel htmlFor="user-name">Full name</FieldLabel>
          <Input
            id="user-name"
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Ana Souza"
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors.name)}
          />
          <FieldError errors={fieldErrors.name?.map((message) => ({ message }))} />
        </Field>

        <Field data-invalid={Boolean(fieldErrors.email)}>
          <FieldLabel htmlFor="user-email">Work email</FieldLabel>
          <Input
            id="user-email"
            type="email"
            value={values.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="ana.souza@intermediano.com"
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors.email)}
          />
          <FieldDescription>Must match the account they sign in with. No password is needed.</FieldDescription>
          <FieldError errors={fieldErrors.email?.map((message) => ({ message }))} />
        </Field>

        <Field data-invalid={Boolean(fieldErrors.roleId)}>
          <FieldLabel htmlFor="user-role">Role</FieldLabel>
          <Select
            value={values.roleId || null}
            onValueChange={(value) => update("roleId", (value as string | null) ?? "")}
            items={(roles.data ?? []).map((role) => ({ label: role.name, value: role.id }))}
            disabled={roles.isPending || roles.isError}
          >
            <SelectTrigger
              id="user-role"
              className="w-full capitalize data-placeholder:normal-case"
              aria-invalid={Boolean(fieldErrors.roleId)}
            >
              <SelectValue placeholder={roles.isPending ? "Loading roles…" : "Choose a role"} />
            </SelectTrigger>
            <SelectContent>
              {(roles.data ?? []).map((role) => (
                <SelectItem key={role.id} value={role.id} className="capitalize">
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {roles.isError && <FieldDescription>Roles couldn&apos;t be loaded. Close and try again.</FieldDescription>}
          <FieldError errors={fieldErrors.roleId?.map((message) => ({ message }))} />
        </Field>

        {selectedRole && <RolePreview role={selectedRole} />}
        {user && !user.roleId && (
          <p className="rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
            This person currently has no access. Saving with a role restores it.
          </p>
        )}
      </FieldGroup>

      <SheetFooter className="border-t px-6 py-4">
        {saveUser.isError && (
          <p role="alert" className="text-sm text-destructive">
            {saveUser.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone} disabled={saveUser.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={saveUser.isPending}>
            {saveUser.isPending && <Loader2Icon className="animate-spin" />}
            {user ? "Save changes" : "Add user"}
          </Button>
        </div>
      </SheetFooter>
    </form>
  )
}

function RolePreview({ role }: { role: RoleSummary }) {
  const levels = toAccessLevels(role.permissions)
  const granted = permissionResources.filter((resource) => levels[resource] !== "none")

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-primary/15 bg-primary/5 p-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium capitalize">{role.name}</span>
        {role.description && <span className="text-xs text-muted-foreground">{role.description}</span>}
      </div>
      <span className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <GlobeIcon className="mt-px size-3.5 shrink-0 text-primary" />
        {role.allClusters ? "All clusters" : role.clusters.map((cluster) => cluster.label).join(", ")}
      </span>
      {granted.length === 0 ? (
        <span className="text-xs text-muted-foreground">This role has no permissions yet.</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {granted.map((resource) => (
            <Badge
              key={resource}
              variant="outline"
              className={levels[resource] === "manage" ? "border-primary/30 text-primary" : "text-muted-foreground"}
            >
              {permissionResourceLabels[resource]}
              {levels[resource] === "view" && " · view"}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
