"use client"

import { useState } from "react"
import {
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  UserXIcon,
  XIcon,
} from "lucide-react"
import { cn } from "cn"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useUsers } from "@/hooks/use-users"
import { ADMIN_ROLE_NAME } from "@/lib/permissions"
import type { AdminUser } from "@/lib/users"
import { RevokeAccessDialog } from "./revoke-access-dialog"
import { UserAvatar } from "@/components/user-avatar"
import { UserFormSheet } from "./user-form-sheet"

const NO_ACCESS_FILTER = "__none__"

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" })

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "—"
}

function matchesSearch(user: AdminUser, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [user.name, user.email, user.roleName]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(needle))
}

function matchesRole(user: AdminUser, roleFilter: string | null) {
  if (roleFilter === null) return true
  if (roleFilter === NO_ACCESS_FILTER) return user.roleId === null
  return user.roleName === roleFilter
}

type UsersWorkspaceProps = {
  canManage: boolean
  currentUserId: string
}

export function UsersWorkspace({ canManage, currentUserId }: UsersWorkspaceProps) {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [sheet, setSheet] = useState<{ open: boolean; user: AdminUser | null; key: number }>({
    open: false,
    user: null,
    key: 0,
  })
  const [revoke, setRevoke] = useState<{ open: boolean; user: AdminUser | null }>({ open: false, user: null })
  const { data, isPending, isError, isFetching, refetch } = useUsers()

  const users = data ?? []
  const visibleUsers = users.filter((user) => matchesSearch(user, search) && matchesRole(user, roleFilter))
  const roleNames = [...new Set(users.map((user) => user.roleName).filter((name): name is string => Boolean(name)))]
  const withoutAccessCount = users.filter((user) => user.roleId === null).length
  const trimmedSearch = search.trim()

  const stats = [
    { label: "Users with access", value: users.length - withoutAccessCount, icon: UserCheckIcon },
    { label: "Admins", value: users.filter((user) => user.roleName === ADMIN_ROLE_NAME).length, icon: ShieldCheckIcon },
    { label: "Without access", value: withoutAccessCount, icon: UserXIcon },
  ]

  const roleFilters = [
    { value: null, label: "All" },
    ...roleNames.map((name) => ({ value: name, label: name })),
    ...(withoutAccessCount > 0 ? [{ value: NO_ACCESS_FILTER, label: "No access" }] : []),
  ]

  function openSheet(user: AdminUser | null) {
    setSheet((current) => ({ open: true, user, key: current.key + 1 }))
  }

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Users summary">
        {stats.map((stat) => (
          <Card key={stat.label} className="[--card-spacing:--spacing(5)]">
            <CardContent className="flex items-center gap-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <stat.icon className="size-5" />
              </span>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                {isPending ? (
                  <Skeleton className="mt-1 h-6 w-10" />
                ) : (
                  <span className="text-2xl font-semibold tabular-nums">{stat.value}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="gap-0 py-0">
        <CardHeader className="gap-4 border-b py-5 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-1">
            <CardTitle>Users</CardTitle>
            <CardDescription>People who can sign in to the admin console, and the role they have.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, role…"
                aria-label="Search users"
                className="pl-8 focus-visible:border-primary focus-visible:ring-primary/25"
              />
            </div>
            {canManage && (
              <Button onClick={() => openSheet(null)}>
                <PlusIcon />
                Add user
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            {roleFilters.map((filter) => {
              const isActive = roleFilter === filter.value
              return (
                <Badge
                  key={filter.label}
                  render={<button type="button" onClick={() => setRoleFilter(filter.value)} />}
                  aria-pressed={isActive}
                  className={cn(
                    "cursor-pointer capitalize",
                    isActive
                      ? "bg-primary text-primary-foreground hover:bg-primary/85"
                      : "bg-primary/10 text-primary hover:bg-primary/15"
                  )}
                >
                  {filter.label}
                </Badge>
              )
            })}
            {trimmedSearch && (
              <Badge
                render={<button type="button" onClick={() => setSearch("")} />}
                variant="outline"
                className="cursor-pointer gap-1"
              >
                &ldquo;{trimmedSearch}&rdquo;
                <XIcon className="size-3" />
                <span className="sr-only">Clear search</span>
              </Badge>
            )}
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {isPending ? "Loading…" : `${visibleUsers.length} of ${users.length}`}
            </span>
            {isFetching && !isPending && (
              <RefreshCwIcon className="size-3.5 animate-spin text-primary" aria-label="Refreshing" />
            )}
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {isError ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">Users couldn&apos;t be loaded.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCwIcon />
                Try again
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6 text-xs font-semibold tracking-wide text-primary uppercase">User</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-primary uppercase">Role</TableHead>
                  <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase md:table-cell">
                    Added
                  </TableHead>
                  <TableHead className="w-14 pr-6">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody key={isPending ? "loading" : "ready"} className="animate-in duration-300 fade-in-0">
                {isPending ? (
                  Array.from({ length: 4 }, (_, index) => (
                    <TableRow key={index}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-8 rounded-full" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell className="pr-6" />
                    </TableRow>
                  ))
                ) : visibleUsers.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                      {users.length === 0 ? "No users yet." : "No users match your filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleUsers.map((user) => {
                    const isSelf = user.id === currentUserId
                    return (
                      <TableRow key={user.id} className="hover:bg-primary/5">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={user.name} avatarUrl={user.avatarUrl} muted={!user.roleId} />
                            <div className="flex flex-col">
                              <span className="flex items-center gap-2 font-medium">
                                {user.name}
                                {isSelf && (
                                  <Badge variant="outline" className="border-primary/30 text-primary">
                                    You
                                  </Badge>
                                )}
                              </span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.roleName ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                "capitalize",
                                user.roleName === ADMIN_ROLE_NAME
                                  ? "border-transparent bg-primary text-primary-foreground"
                                  : "border-primary/40 bg-primary/5 text-primary"
                              )}
                            >
                              {user.roleName}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-dashed text-muted-foreground">
                              No access
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground tabular-nums md:table-cell">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          {canManage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.name}`}>
                                    <MoreHorizontalIcon />
                                  </Button>
                                }
                              />
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => openSheet(user)}>
                                  <PencilIcon />
                                  {user.roleId ? "Edit" : "Restore access"}
                                </DropdownMenuItem>
                                {user.roleId && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      variant="destructive"
                                      disabled={isSelf}
                                      onClick={() => setRevoke({ open: true, user })}
                                    >
                                      <UserXIcon />
                                      {isSelf ? "Can't revoke yourself" : "Revoke access"}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="px-6 py-3 text-xs text-muted-foreground">
          Role changes take effect within 5 minutes, or the next time the person signs in.
        </CardFooter>
      </Card>

      {canManage && (
        <>
          <UserFormSheet
            open={sheet.open}
            user={sheet.user}
            formKey={sheet.key}
            onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
          />
          <RevokeAccessDialog
            open={revoke.open}
            user={revoke.user}
            onOpenChange={(open) => setRevoke((current) => ({ ...current, open }))}
          />
        </>
      )}
    </div>
  )
}
