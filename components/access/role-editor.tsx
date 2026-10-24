"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, InfoIcon, Loader2Icon, LockIcon, RefreshCwIcon, ShieldAlertIcon } from "lucide-react"
import { z } from "zod"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useRole, useSaveRole } from "@/hooks/use-roles"
import {
  permissionResources,
  toAccessLevels,
  toPermissionNames,
  type AccessLevel,
  type AccessLevels,
  type PermissionResource,
} from "@/lib/permissions"
import { roleFormSchema, type RoleDetail, type RoleFormInput } from "@/lib/roles"
import { ClusterAccessCard } from "./cluster-access-card"
import { PermissionMatrix } from "./permission-matrix"
import { UserAvatar } from "@/components/user-avatar"

type FieldErrors = Partial<Record<keyof RoleFormInput, string[]>>

type RoleEditorProps = {
  roleId: string | null
  copyFromId: string | null
  canManage: boolean
  currentRoleName: string | null
}

const backLink = (
  <Link
    href="/admin/users/roles"
    className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit text-muted-foreground" })}
  >
    <ArrowLeftIcon />
    All roles
  </Link>
)

export function RoleEditor({ roleId, copyFromId, canManage, currentRoleName }: RoleEditorProps) {
  const sourceId = roleId ?? copyFromId
  const { data, isPending, isError, refetch } = useRole(sourceId)

  if (sourceId && isPending) {
    return (
      <div className="flex flex-col gap-4">
        {backLink}
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <Skeleton className="h-[32rem] rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  if (sourceId && (isError || !data)) {
    return (
      <div className="flex flex-col gap-4">
        {backLink}
        <Card className="[--card-spacing:--spacing(10)]">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              {isError ? "This role couldn't be loaded." : "This role doesn't exist anymore."}
            </p>
            {isError && (
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCwIcon />
                Try again
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const role = roleId ? (data ?? null) : null
  const source = data ?? null

  return (
    <div className="flex flex-col gap-4">
      {backLink}
      <RoleForm
        key={sourceId ?? "new"}
        role={role}
        initial={{
          name: role ? role.name : source ? `${source.name} copy` : "",
          description: source?.description ?? "",
          levels: toAccessLevels(source?.permissions ?? []),
          allClusters: source?.allClusters ?? true,
          clusterIds: source?.clusters.map((cluster) => cluster.id) ?? [],
        }}
        readOnly={!canManage || Boolean(role?.isProtected)}
        isOwnRole={Boolean(role && currentRoleName === role.name)}
      />
    </div>
  )
}

type RoleFormState = {
  name: string
  description: string
  levels: AccessLevels
  allClusters: boolean
  clusterIds: string[]
}

function countClusterChanges(current: RoleFormState, initial: RoleFormState) {
  if (current.allClusters) return Number(!initial.allClusters)
  const before = new Set(initial.allClusters ? [] : initial.clusterIds)
  const after = new Set(current.clusterIds)
  const changedIds = [...after].filter((id) => !before.has(id)).length + [...before].filter((id) => !after.has(id)).length
  return Number(initial.allClusters) + changedIds
}

function countChanges(current: RoleFormState, initial: RoleFormState) {
  const changedModules = permissionResources.filter((resource) => current.levels[resource] !== initial.levels[resource])
  return (
    changedModules.length +
    countClusterChanges(current, initial) +
    Number(current.name.trim() !== initial.name.trim()) +
    Number(current.description.trim() !== initial.description.trim())
  )
}

function RoleForm({
  role,
  initial,
  readOnly,
  isOwnRole,
}: {
  role: RoleDetail | null
  initial: RoleFormState
  readOnly: boolean
  isOwnRole: boolean
}) {
  const router = useRouter()
  const [form, setForm] = useState<RoleFormState>(initial)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const saveRole = useSaveRole()

  const changeCount = countChanges(form, initial)
  const isNew = role === null
  const wouldLockSelfOut = isOwnRole && form.levels.users !== "manage"
  const grantedCount = permissionResources.filter((resource) => form.levels[resource] !== "none").length

  function setLevel(resource: PermissionResource, level: AccessLevel) {
    setForm((current) => ({ ...current, levels: { ...current.levels, [resource]: level } }))
  }

  function setText(key: "name" | "description", value: string) {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  function setClusterAccess(next: { allClusters: boolean; clusterIds: string[] }) {
    setForm((current) => ({ ...current, ...next }))
    setFieldErrors((current) => ({ ...current, clusterIds: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (readOnly || wouldLockSelfOut) return

    const input: RoleFormInput = {
      name: form.name,
      description: form.description,
      permissions: toPermissionNames(form.levels),
      allClusters: form.allClusters,
      clusterIds: form.allClusters ? [] : form.clusterIds,
    }
    const parsed = roleFormSchema.safeParse(input)
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors)
      return
    }

    saveRole.mutate(
      { roleId: role?.id ?? null, input },
      { onSuccess: () => router.push("/admin/users/roles") }
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex animate-in flex-col gap-6 duration-300 fade-in-0">
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="[--card-spacing:--spacing(6)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isNew ? "New role" : "Role details"}
                {role?.isProtected && (
                  <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
                    <LockIcon />
                    Protected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {role?.isProtected
                  ? "The admin role always has full access to every module and can't be changed."
                  : "Give the role a short name people will recognise in the users list."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <Field data-invalid={Boolean(fieldErrors.name)}>
                  <FieldLabel htmlFor="role-name">Name</FieldLabel>
                  <Input
                    id="role-name"
                    value={form.name}
                    onChange={(event) => setText("name", event.target.value)}
                    placeholder="e.g. payroll officer"
                    disabled={readOnly}
                    autoComplete="off"
                    aria-invalid={Boolean(fieldErrors.name)}
                  />
                  <FieldError errors={fieldErrors.name?.map((message) => ({ message }))} />
                </Field>
                <Field data-invalid={Boolean(fieldErrors.description)}>
                  <FieldLabel htmlFor="role-description">Description</FieldLabel>
                  <Input
                    id="role-description"
                    value={form.description}
                    onChange={(event) => setText("description", event.target.value)}
                    placeholder="What this role is for"
                    disabled={readOnly}
                    autoComplete="off"
                    aria-invalid={Boolean(fieldErrors.description)}
                  />
                  <FieldError errors={fieldErrors.description?.map((message) => ({ message }))} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <ClusterAccessCard
            allClusters={form.allClusters}
            clusterIds={form.clusterIds}
            readOnly={readOnly}
            errors={fieldErrors.clusterIds}
            onChange={setClusterAccess}
          />

          <Card className="gap-0 py-0">
            <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
              <CardTitle className="flex items-center gap-2">
                Permissions
                <Badge className="bg-primary/10 text-primary tabular-nums">
                  {grantedCount} of {permissionResources.length} modules
                </Badge>
              </CardTitle>
              <CardDescription>
                View lets people open a module. Manage also lets them create, edit and delete records there.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <PermissionMatrix
                levels={form.levels}
                initialLevels={isNew ? undefined : initial.levels}
                readOnly={readOnly}
                onChange={setLevel}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6 xl:sticky xl:top-28">
          {role && (
            <Card className="[--card-spacing:--spacing(5)]">
              <CardHeader>
                <CardTitle>People with this role</CardTitle>
                <CardDescription>
                  {role.members.length === 0
                    ? "Nobody has this role yet."
                    : `${role.members.length} ${role.members.length === 1 ? "person" : "people"}`}
                </CardDescription>
              </CardHeader>
              {role.members.length > 0 && (
                <CardContent>
                  <ul className="flex max-h-80 flex-col gap-3 overflow-y-auto">
                    {role.members.map((member) => (
                      <li key={member.id} className="flex items-center gap-3">
                        <UserAvatar name={member.name} />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium">{member.name}</span>
                          <span className="truncate text-xs text-muted-foreground">{member.email}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          )}
          <div className="flex gap-3 rounded-xl bg-muted/60 p-4 text-xs text-muted-foreground">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            <p>Changes reach signed-in users within 5 minutes, or the next time they sign in.</p>
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl bg-popover/95 p-3 pl-5 shadow-lg ring-1 ring-foreground/10 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            {wouldLockSelfOut ? (
              <span className="flex items-center gap-2 text-destructive">
                <ShieldAlertIcon className="size-4" />
                This is your role. Keep Manage on Users &amp; roles so you don&apos;t lock yourself out.
              </span>
            ) : saveRole.isError ? (
              <span role="alert" className="text-destructive">
                {saveRole.error.message}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {isNew
                  ? "Name the role and choose its permissions."
                  : changeCount === 0
                    ? "No unsaved changes"
                    : `${changeCount} unsaved ${changeCount === 1 ? "change" : "changes"}`}
              </span>
            )}
          </div>
          <div className="flex justify-end gap-2">
            {!isNew && (
              <Button
                type="button"
                variant="outline"
                disabled={changeCount === 0 || saveRole.isPending}
                onClick={() => {
                  setForm(initial)
                  setFieldErrors({})
                  saveRole.reset()
                }}
              >
                Discard
              </Button>
            )}
            <Button
              type="submit"
              disabled={saveRole.isPending || wouldLockSelfOut || (!isNew && changeCount === 0)}
            >
              {saveRole.isPending && <Loader2Icon className="animate-spin" />}
              {isNew ? "Create role" : "Save changes"}
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}
