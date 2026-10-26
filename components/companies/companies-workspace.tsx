"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArchiveIcon,
  BadgeCheckIcon,
  Building2Icon,
  ContactIcon,
  EyeIcon,
  MailIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { cn } from "cn"
import { CompanyMark } from "@/components/intermediano-companies/company-mark"
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
import { useCompanies } from "@/hooks/use-companies"
import type { Company } from "@/lib/companies"
import { ArchiveCompanyDialog } from "./archive-company-dialog"
import { CompanyFormSheet } from "./company-form-sheet"

type StatusFilter = "all" | "customers" | "prospects"

const statusFilters: { id: StatusFilter; name: string }[] = [
  { id: "all", name: "All" },
  { id: "customers", name: "Customers" },
  { id: "prospects", name: "Prospects" },
]

function matchesSearch(company: Company, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [
    company.name,
    company.website,
    company.country,
    company.city,
    company.industryName,
    company.mainContact?.fullName,
    company.mainContact?.email,
  ]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(needle))
}

function matchesStatus(company: Company, status: StatusFilter) {
  if (status === "customers") return company.isCustomer
  if (status === "prospects") return !company.isCustomer
  return true
}

function filterChipClassName(isActive: boolean) {
  return cn(
    "cursor-pointer",
    isActive ? "bg-primary text-primary-foreground hover:bg-primary/85" : "bg-primary/10 text-primary hover:bg-primary/15"
  )
}

type CompaniesWorkspaceProps = {
  canManage: boolean
}

export function CompaniesWorkspace({ canManage }: CompaniesWorkspaceProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [countryFilter, setCountryFilter] = useState<string | null>(null)
  const [sheet, setSheet] = useState<{ open: boolean; company: Company | null; key: number }>({
    open: false,
    company: null,
    key: 0,
  })
  const [archive, setArchive] = useState<{ open: boolean; company: Company | null }>({
    open: false,
    company: null,
  })
  const { data, isPending, isError, isFetching, refetch } = useCompanies()

  const companies = data ?? []
  const visibleCompanies = companies.filter(
    (company) =>
      matchesSearch(company, search) &&
      matchesStatus(company, statusFilter) &&
      (countryFilter === null || company.country === countryFilter)
  )
  const countriesInUse = [
    ...new Set(companies.map((company) => company.country).filter((country): country is string => Boolean(country))),
  ].sort((a, b) => a.localeCompare(b))
  const trimmedSearch = search.trim()

  const stats = [
    { label: "Companies", value: companies.length, icon: Building2Icon },
    { label: "Customers", value: companies.filter((company) => company.isCustomer).length, icon: BadgeCheckIcon },
    {
      label: "Contacts",
      value: companies.reduce((total, company) => total + company.contactCount, 0),
      icon: ContactIcon,
    },
  ]

  function openSheet(company: Company | null) {
    setSheet((current) => ({ open: true, company, key: current.key + 1 }))
  }

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Companies summary">
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
            <CardTitle>Company directory</CardTitle>
            <CardDescription>Client and prospect companies shared by every cluster.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, industry, contact…"
                aria-label="Search companies"
                className="pl-8 focus-visible:border-primary focus-visible:ring-primary/25"
              />
            </div>
            {canManage && (
              <Button onClick={() => openSheet(null)}>
                <PlusIcon />
                Add company
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            {statusFilters.map((filter) => {
              const isActive = statusFilter === filter.id
              return (
                <Badge
                  key={filter.id}
                  render={<button type="button" onClick={() => setStatusFilter(filter.id)} />}
                  aria-pressed={isActive}
                  className={filterChipClassName(isActive)}
                >
                  {filter.name}
                </Badge>
              )
            })}
            {countriesInUse.length > 0 && <span aria-hidden className="mx-1 h-4 w-px bg-border" />}
            {countriesInUse.map((country) => {
              const isActive = countryFilter === country
              return (
                <Badge
                  key={country}
                  render={<button type="button" onClick={() => setCountryFilter(isActive ? null : country)} />}
                  aria-pressed={isActive}
                  className={filterChipClassName(isActive)}
                >
                  {country}
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
              {isPending ? "Loading…" : `${visibleCompanies.length} of ${companies.length}`}
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
                  Company
                </TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase md:table-cell">
                  Location
                </TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase xl:table-cell">
                  Industry
                </TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase lg:table-cell">
                  Main contact
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wide text-primary uppercase">Status</TableHead>
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
                        <Skeleton className="size-9 rounded-xl" />
                        <div className="flex flex-col gap-1.5">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="pr-6" />
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-12">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="text-sm text-muted-foreground">Companies couldn&apos;t be loaded.</p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCwIcon />
                        Try again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : visibleCompanies.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    {companies.length === 0 ? "No companies yet." : "No companies match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                visibleCompanies.map((company) => {
                  const href = `/admin/companies/${company.id}`
                  const location = [company.city, company.country].filter(Boolean).join(", ")
                  const contact = company.mainContact
                  return (
                    <TableRow key={company.id} className="hover:bg-primary/5">
                      <TableCell className="pl-6">
                        <Link href={href} className="group flex items-center gap-3">
                          <CompanyMark name={company.name} />
                          <div className="flex min-w-0 flex-col">
                            <span className="font-medium group-hover:text-primary">{company.name}</span>
                            <span className="truncate text-xs text-muted-foreground">
                              {company.website?.replace(/^https?:\/\//, "") ?? "—"}
                            </span>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{location || "—"}</TableCell>
                      <TableCell className="hidden text-muted-foreground xl:table-cell">
                        {company.industryName ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {contact ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm">{contact.fullName}</span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              {contact.email ? (
                                <>
                                  <MailIcon className="size-3" />
                                  {contact.email}
                                </>
                              ) : (
                                (contact.position ?? "—")
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {company.isCustomer ? (
                          <Badge className="bg-primary/10 text-primary">Customer</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Prospect
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${company.name}`}>
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
                                <DropdownMenuItem onClick={() => openSheet(company)}>
                                  <PencilIcon />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setArchive({ open: true, company })}
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
          <CompanyFormSheet
            open={sheet.open}
            company={sheet.company}
            formKey={sheet.key}
            onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
          />
          <ArchiveCompanyDialog
            open={archive.open}
            company={archive.company}
            onOpenChange={(open) => setArchive((current) => ({ ...current, open }))}
          />
        </>
      )}
    </div>
  )
}
