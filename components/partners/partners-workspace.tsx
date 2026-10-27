"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArchiveIcon,
  EyeIcon,
  FileTextIcon,
  GlobeIcon,
  HandshakeIcon,
  MailIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PhoneIcon,
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
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePartners } from "@/hooks/use-partners"
import { partnerTypeLabel, type Partner } from "@/lib/partners"
import { ArchivePartnerDialog } from "./archive-partner-dialog"
import { PartnerFormSheet } from "./partner-form-sheet"

function matchesSearch(partner: Partner, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [partner.name, partner.contactName, partner.email, partner.taxId, partner.countryName]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(needle))
}

type FilterChip = { id: string | null; name: string }

function FilterChips({
  chips,
  active,
  onSelect,
}: {
  chips: FilterChip[]
  active: string | null
  onSelect: (id: string | null) => void
}) {
  return chips.map((chip) => {
    const isActive = active === chip.id
    return (
      <Badge
        key={chip.id ?? "all"}
        render={<button type="button" onClick={() => onSelect(chip.id)} />}
        aria-pressed={isActive}
        className={cn(
          "cursor-pointer",
          isActive
            ? "bg-primary text-primary-foreground hover:bg-primary/85"
            : "bg-primary/10 text-primary hover:bg-primary/15"
        )}
      >
        {chip.name}
      </Badge>
    )
  })
}

type PartnersWorkspaceProps = {
  canManage: boolean
}

export function PartnersWorkspace({ canManage }: PartnersWorkspaceProps) {
  const [search, setSearch] = useState("")
  const [countryFilter, setCountryFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [sheet, setSheet] = useState<{ open: boolean; partner: Partner | null; key: number }>({
    open: false,
    partner: null,
    key: 0,
  })
  const [archive, setArchive] = useState<{ open: boolean; partner: Partner | null }>({
    open: false,
    partner: null,
  })
  const { data, isPending, isError, isFetching, refetch } = usePartners()

  const partners = data ?? []
  const visiblePartners = partners.filter(
    (partner) =>
      matchesSearch(partner, search) &&
      (countryFilter === null || partner.countryId === countryFilter) &&
      (typeFilter === null || partner.partnerType === typeFilter)
  )
  const countriesInUse = [
    ...new Map(partners.map((partner) => [partner.countryId, partner.countryName ?? "Unknown country"])).entries(),
  ]
    .map(([id, name]): FilterChip => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const typesInUse = [...new Set(partners.map((partner) => partner.partnerType))]
    .filter((type): type is string => Boolean(type))
    .map((type): FilterChip => ({ id: type, name: partnerTypeLabel(type) ?? type }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const trimmedSearch = search.trim()

  const stats = [
    { label: "Partners", value: partners.length, icon: HandshakeIcon },
    { label: "Countries", value: countriesInUse.length, icon: GlobeIcon },
    {
      label: "Linked contracts",
      value: partners.reduce((total, partner) => total + partner.contractCount, 0),
      icon: FileTextIcon,
    },
  ]

  function openSheet(partner: Partner | null) {
    setSheet((current) => ({ open: true, partner, key: current.key + 1 }))
  }

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Partners summary">
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
            <CardTitle>Partners</CardTitle>
            <CardDescription>Commercial and operational partners shared by every cluster.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, contact, tax ID…"
                aria-label="Search partners"
                className="pl-8 focus-visible:border-primary focus-visible:ring-primary/25"
              />
            </div>
            {canManage && (
              <Button onClick={() => openSheet(null)}>
                <PlusIcon />
                Add partner
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <FilterChips
              chips={[{ id: null, name: "All countries" }, ...countriesInUse]}
              active={countryFilter}
              onSelect={setCountryFilter}
            />
            {typesInUse.length > 0 && (
              <>
                <Separator orientation="vertical" className="mx-1 h-4" />
                <FilterChips
                  chips={[{ id: null, name: "All types" }, ...typesInUse]}
                  active={typeFilter}
                  onSelect={setTypeFilter}
                />
              </>
            )}
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
              {isPending ? "Loading…" : `${visiblePartners.length} of ${partners.length}`}
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
                  Partner
                </TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase sm:table-cell">
                  Type
                </TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase md:table-cell">
                  Country
                </TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase lg:table-cell">
                  Contact
                </TableHead>
                <TableHead className="text-right text-xs font-semibold tracking-wide text-primary uppercase">
                  Contracts
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
                        <Skeleton className="size-9 rounded-xl" />
                        <div className="flex flex-col gap-1.5">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Skeleton className="h-5 w-24 rounded-full" />
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
                  <TableCell colSpan={6} className="py-12">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="text-sm text-muted-foreground">Partners couldn&apos;t be loaded.</p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCwIcon />
                        Try again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : visiblePartners.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    {partners.length === 0 ? "No partners yet." : "No partners match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                visiblePartners.map((partner) => {
                  const href = `/admin/partners/${partner.id}`
                  const typeLabel = partnerTypeLabel(partner.partnerType)
                  return (
                    <TableRow key={partner.id} className="hover:bg-primary/5">
                      <TableCell className="pl-6">
                        <Link href={href} className="group flex items-center gap-3">
                          <CompanyMark name={partner.name} />
                          <div className="flex min-w-0 flex-col">
                            <span className="font-medium group-hover:text-primary">{partner.name}</span>
                            <span className="truncate text-xs text-muted-foreground">{partner.contactName ?? "—"}</span>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {typeLabel ? (
                          <Badge variant="outline" className="border-primary/30 text-primary">
                            {typeLabel}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {partner.countryName ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MailIcon className="size-3" />
                            {partner.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <PhoneIcon className="size-3" />
                            {partner.mobileNumber}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{partner.contractCount}</TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${partner.name}`}>
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
                                <DropdownMenuItem onClick={() => openSheet(partner)}>
                                  <PencilIcon />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setArchive({ open: true, partner })}
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
          <PartnerFormSheet
            open={sheet.open}
            partner={sheet.partner}
            formKey={sheet.key}
            onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
          />
          <ArchivePartnerDialog
            open={archive.open}
            partner={archive.partner}
            onOpenChange={(open) => setArchive((current) => ({ ...current, open }))}
          />
        </>
      )}
    </div>
  )
}
