"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArchiveIcon,
  EyeIcon,
  GlobeIcon,
  MailIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  UserSearchIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"
import { cn } from "cn"
import { UserAvatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useConsultants } from "@/hooks/use-consultants"
import type { Consultant } from "@/lib/consultants"
import type { CountryOption } from "@/lib/intermediano-companies"
import { ArchiveConsultantDialog } from "./archive-consultant-dialog"
import { ConsultantFormSheet } from "./consultant-form-sheet"

function matchesSearch(consultant: Consultant, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [consultant.name, consultant.email, consultant.employer, consultant.mobileNumber, consultant.countryName]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(needle))
}

type ConsultantsWorkspaceProps = {
  canManage: boolean
}

export function ConsultantsWorkspace({ canManage }: ConsultantsWorkspaceProps) {
  const [search, setSearch] = useState("")
  const [countryFilter, setCountryFilter] = useState<string | null>(null)
  const [sheet, setSheet] = useState<{ open: boolean; consultant: Consultant | null; key: number }>({
    open: false,
    consultant: null,
    key: 0,
  })
  const [archive, setArchive] = useState<{ open: boolean; consultant: Consultant | null }>({
    open: false,
    consultant: null,
  })
  const { data, isPending, isError, isFetching, refetch } = useConsultants()

  const consultants = data ?? []
  const visibleConsultants = consultants.filter(
    (consultant) =>
      matchesSearch(consultant, search) && (countryFilter === null || consultant.countryId === countryFilter)
  )
  const countriesInUse = [
    ...new Map(consultants.map((consultant) => [consultant.countryId, consultant.countryName])).entries(),
  ]
    .map(([id, name]): CountryOption => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const trimmedSearch = search.trim()

  const stats = [
    { label: "Consultants", value: consultants.length, icon: UserSearchIcon },
    { label: "Countries", value: countriesInUse.length, icon: GlobeIcon },
    {
      label: "Employees assigned",
      value: consultants.reduce((total, consultant) => total + consultant.employeeCount, 0),
      icon: UsersIcon,
    },
  ]

  const countryFilters = [{ id: null, name: "All" }, ...countriesInUse]

  function openSheet(consultant: Consultant | null) {
    setSheet((current) => ({ open: true, consultant, key: current.key + 1 }))
  }

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Consultants summary">
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
            <CardTitle>Consultants</CardTitle>
            <CardDescription>Recruitment consultants shared by every cluster.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, employer…"
                aria-label="Search consultants"
                className="pl-8 focus-visible:border-primary focus-visible:ring-primary/25"
              />
            </div>
            {canManage && (
              <Button onClick={() => openSheet(null)}>
                <PlusIcon />
                Add consultant
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            {countryFilters.map((filter) => {
              const isActive = countryFilter === filter.id
              return (
                <Badge
                  key={filter.name}
                  render={<button type="button" onClick={() => setCountryFilter(filter.id)} />}
                  aria-pressed={isActive}
                  className={cn(
                    "cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground hover:bg-primary/85"
                      : "bg-primary/10 text-primary hover:bg-primary/15"
                  )}
                >
                  {filter.name}
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
              {isPending ? "Loading…" : `${visibleConsultants.length} of ${consultants.length}`}
            </span>
            {isFetching && !isPending && (
              <RefreshCwIcon className="size-3.5 animate-spin text-primary" aria-label="Refreshing" />
            )}
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 text-xs font-semibold tracking-wide text-primary uppercase">
                  Consultant
                </TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase md:table-cell">
                  Country
                </TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase lg:table-cell">
                  Contact
                </TableHead>
                <TableHead className="text-right text-xs font-semibold tracking-wide text-primary uppercase">
                  Employees
                </TableHead>
                <TableHead className="w-14 pr-6">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody key={isPending ? "loading" : "ready"} className="animate-in duration-300 fade-in-0">
              {isPending ? (
                Array.from({ length: 3 }, (_, index) => (
                  <TableRow key={index}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-8 rounded-full" />
                        <div className="flex flex-col gap-1.5">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-4 w-6" />
                    </TableCell>
                    <TableCell className="pr-6" />
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-12">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="text-sm text-muted-foreground">Consultants couldn&apos;t be loaded.</p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCwIcon />
                        Try again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : visibleConsultants.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    {consultants.length === 0 ? "No consultants yet." : "No consultants match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                visibleConsultants.map((consultant) => {
                  const href = `/admin/consultants/${consultant.id}`
                  return (
                    <TableRow key={consultant.id} className="hover:bg-primary/5">
                      <TableCell className="pl-6">
                        <Link href={href} className="group flex items-center gap-3">
                          <UserAvatar name={consultant.name} />
                          <div className="flex flex-col">
                            <span className="font-medium group-hover:text-primary">{consultant.name}</span>
                            <span className="text-xs text-muted-foreground">{consultant.employer ?? "—"}</span>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {consultant.countryName}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                          {consultant.email && (
                            <span className="flex items-center gap-1">
                              <MailIcon className="size-3" />
                              {consultant.email}
                            </span>
                          )}
                          {consultant.mobileNumber && (
                            <span className="flex items-center gap-1">
                              <PhoneIcon className="size-3" />
                              {consultant.mobileNumber}
                            </span>
                          )}
                          {!consultant.email && !consultant.mobileNumber && "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{consultant.employeeCount}</TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${consultant.name}`}>
                                <MoreHorizontalIcon />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem render={<Link href={href} />}>
                              <EyeIcon />
                              View details
                            </DropdownMenuItem>
                            {canManage && (
                              <>
                                <DropdownMenuItem onClick={() => openSheet(consultant)}>
                                  <PencilIcon />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setArchive({ open: true, consultant })}
                                >
                                  <ArchiveIcon />
                                  Archive
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canManage && (
        <>
          <ConsultantFormSheet
            open={sheet.open}
            consultant={sheet.consultant}
            formKey={sheet.key}
            onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
          />
          <ArchiveConsultantDialog
            open={archive.open}
            consultant={archive.consultant}
            onOpenChange={(open) => setArchive((current) => ({ ...current, open }))}
          />
        </>
      )}
    </div>
  )
}
