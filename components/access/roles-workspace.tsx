"use client"

import { useState } from "react"
import Link from "next/link"
import {
  CopyIcon,
  EyeIcon,
  GlobeIcon,
  Loader2Icon,
  LockIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useDeleteRole, useRoles } from "@/hooks/use-roles"
import { permissionResourceLabels, permissionResources, toAccessLevels } from "@/lib/permissions"
import type { RoleSummary } from "@/lib/roles"

const MAX_MODULE_BADGES = 6

export function RolesWorkspace({ canManage }: { canManage: boolean }) {
  const { data, isPending, isError, refetch } = useRoles()
  const [deleting, setDeleting] = useState<{ open: boolean; role: RoleSummary | null }>({ open: false, role: null })

  if (isError) {
    return (
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">Roles couldn&apos;t be loaded.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCwIcon />
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid animate-in gap-4 duration-300 fade-in-0 slide-in-from-bottom-2 sm:grid-cols-2 xl:grid-cols-3">
      {isPending
        ? Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-64 rounded-xl" />)
        : data.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            canManage={canManage}
            onDelete={() => setDeleting({ open: true, role })}
          />
        ))}

      {canManage && !isPending && (
        <Link
          href="/admin/users/roles/new"
          className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-primary/30 text-center transition-colors hover:border-primary/60 hover:bg-primary/5"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <PlusIcon className="size-5" />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">New role</span>
            <span className="text-xs text-muted-foreground">Pick exactly which modules it can see and change.</span>
          </span>
        </Link>
      )}

      <DeleteRoleDialog
        open={deleting.open}
        role={deleting.role}
        onOpenChange={(open) => setDeleting((current) => ({ ...current, open }))}
      />
    </div>
  )
}

function RoleCard({ role, canManage, onDelete }: { role: RoleSummary; canManage: boolean; onDelete: () => void }) {
  const levels = toAccessLevels(role.permissions)
  const granted = permissionResources.filter((resource) => levels[resource] !== "none")
  const isEditable = canManage && !role.isProtected
  const href = `/admin/users/roles/${role.id}`

  return (
    <Card className="gap-4 [--card-spacing:--spacing(5)]">
      <CardHeader className="grid-cols-[auto_1fr_auto] items-center gap-x-3">
        <span className="row-span-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheckIcon className="size-5" />
        </span>
        <CardTitle className="flex items-center gap-2 capitalize">
          {role.name}
          {role.isProtected && (
            <Badge variant="outline" className="gap-1 border-primary/30 text-primary normal-case">
              <LockIcon />
              Protected
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="col-start-2 line-clamp-1">
          {role.description ?? "No description"}
        </CardDescription>
        {canManage && (
          <div className="col-start-3 row-span-2 row-start-1">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${role.name}`}>
                    <MoreHorizontalIcon />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem render={<Link href={`/admin/users/roles/new?from=${role.id}`} />}>
                  <CopyIcon />
                  Duplicate
                </DropdownMenuItem>
                {!role.isProtected && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" disabled={role.userCount > 0} onClick={onDelete}>
                      <Trash2Icon />
                      {role.userCount > 0 ? "Reassign users to delete" : "Delete role"}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col rounded-lg bg-muted/60 px-3 py-2">
            <span className="text-xs text-muted-foreground">Users</span>
            <span className="flex items-center gap-1.5 text-lg font-semibold tabular-nums">
              <UsersIcon className="size-4 text-muted-foreground" />
              {role.userCount}
            </span>
          </div>
          <div className="flex flex-col rounded-lg bg-muted/60 px-3 py-2">
            <span className="text-xs text-muted-foreground">Modules</span>
            <span className="text-lg font-semibold tabular-nums">
              {granted.length}
              <span className="text-sm font-normal text-muted-foreground"> of {permissionResources.length}</span>
            </span>
          </div>
        </div>
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <GlobeIcon className="mt-px size-3.5 shrink-0 text-primary" />
          <span className="line-clamp-2">
            {role.allClusters ? "All clusters" : role.clusters.map((cluster) => cluster.label).join(", ")}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {granted.length === 0 ? (
            <span className="text-xs text-muted-foreground">No permissions yet.</span>
          ) : (
            <>
              {granted.slice(0, MAX_MODULE_BADGES).map((resource) => (
                <Badge
                  key={resource}
                  variant="outline"
                  className={levels[resource] === "manage" ? "border-primary/30 text-primary" : "text-muted-foreground"}
                >
                  {permissionResourceLabels[resource]}
                </Badge>
              ))}
              {granted.length > MAX_MODULE_BADGES && (
                <Badge variant="secondary">+{granted.length - MAX_MODULE_BADGES} more</Badge>
              )}
            </>
          )}
        </div>
      </CardContent>

      <CardFooter className="px-5 py-3">
        <Link href={href} className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}>
          {isEditable ? <PencilIcon /> : <EyeIcon />}
          {isEditable ? "Edit permissions" : "View permissions"}
        </Link>
      </CardFooter>
    </Card>
  )
}

function DeleteRoleDialog({
  open,
  role,
  onOpenChange,
}: {
  open: boolean
  role: RoleSummary | null
  onOpenChange: (open: boolean) => void
}) {
  const deleteRole = useDeleteRole()

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) deleteRole.reset()
    onOpenChange(nextOpen)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete the <span className="capitalize">{role?.name}</span> role?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Nobody has this role right now. Its permission settings will be removed and can&apos;t be recovered.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteRole.isError && (
          <p role="alert" className="text-sm text-destructive">
            {deleteRole.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteRole.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteRole.isPending}
            onClick={() => role && deleteRole.mutate(role.id, { onSuccess: () => handleOpenChange(false) })}
          >
            {deleteRole.isPending && <Loader2Icon className="animate-spin" />}
            Delete role
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
