"use client"

import { Fragment, useState } from "react"
import {
  ArchiveIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  GlobeIcon,
  MoreHorizontalIcon,
  PartyPopperIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { cn } from "cn"
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
import { useHolidaySets } from "@/hooks/use-holidays"
import { formatHolidayDate, nextHoliday, type HolidaySet } from "@/lib/holidays"
import { ArchiveHolidayDialog } from "./archive-holiday-dialog"
import { HolidayFormSheet } from "./holiday-form-sheet"

function matchesSearch(set: HolidaySet, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [set.countryName, String(set.year), ...set.holidays.map((entry) => entry.title)].some((value) =>
    value.toLowerCase().includes(needle)
  )
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

type HolidaysWorkspaceProps = {
  canManage: boolean
}

export function HolidaysWorkspace({ canManage }: HolidaysWorkspaceProps) {
  const [search, setSearch] = useState("")
  const [countryFilter, setCountryFilter] = useState<string | null>(null)
  const [yearFilter, setYearFilter] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sheet, setSheet] = useState<{ open: boolean; holidaySet: HolidaySet | null; key: number }>({
    open: false,
    holidaySet: null,
    key: 0,
  })
  const [archive, setArchive] = useState<{ open: boolean; holidaySet: HolidaySet | null }>({
    open: false,
    holidaySet: null,
  })
  const { data, isPending, isError, isFetching, refetch } = useHolidaySets()

  const today = new Date()
  const currentYear = today.getFullYear()
  const holidaySets = data ?? []
  const visibleSets = holidaySets.filter(
    (set) =>
      matchesSearch(set, search) &&
      (countryFilter === null || set.countryId === countryFilter) &&
      (yearFilter === null || String(set.year) === yearFilter)
  )
  const countriesInUse = [...new Map(holidaySets.map((set) => [set.countryId, set.countryName])).entries()]
    .map(([id, name]): FilterChip => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const yearsInUse = [...new Set(holidaySets.map((set) => set.year))]
    .sort((a, b) => b - a)
    .map((year): FilterChip => ({ id: String(year), name: String(year) }))
  const trimmedSearch = search.trim()

  const stats = [
    { label: "Holiday lists", value: holidaySets.length, icon: CalendarDaysIcon },
    { label: "Countries", value: countriesInUse.length, icon: GlobeIcon },
    {
      label: `Holidays in ${currentYear}`,
      value: holidaySets
        .filter((set) => set.year === currentYear)
        .reduce((total, set) => total + set.holidays.length, 0),
      icon: PartyPopperIcon,
    },
  ]

  function openSheet(holidaySet: HolidaySet | null) {
    setSheet((current) => ({ open: true, holidaySet, key: current.key + 1 }))
  }

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Holidays summary">
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
            <CardTitle>Country holidays</CardTitle>
            <CardDescription>Public holidays per country and year, shared by every cluster.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search country or holiday…"
                aria-label="Search holidays"
                className="pl-8 focus-visible:border-primary focus-visible:ring-primary/25"
              />
            </div>
            {canManage && (
              <Button onClick={() => openSheet(null)}>
                <PlusIcon />
                Add holidays
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <FilterChips
              chips={[{ id: null, name: "All countries" }, ...countriesInUse]}
              active={countryFilter}
              onSelect={setCountryFilter}
            />
            {yearsInUse.length > 1 && (
              <>
                <Separator orientation="vertical" className="mx-1 h-4" />
                <FilterChips
                  chips={[{ id: null, name: "All years" }, ...yearsInUse]}
                  active={yearFilter}
                  onSelect={setYearFilter}
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
              {isPending ? "Loading…" : `${visibleSets.length} of ${holidaySets.length}`}
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
                  Country
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wide text-primary uppercase">Year</TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase md:table-cell">
                  Next holiday
                </TableHead>
                <TableHead className="text-right text-xs font-semibold tracking-wide text-primary uppercase">
                  Holidays
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
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
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
                      <p className="text-sm text-muted-foreground">Holidays couldn&apos;t be loaded.</p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCwIcon />
                        Try again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : visibleSets.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    {holidaySets.length === 0 ? "No holidays configured yet." : "No holidays match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                visibleSets.map((set) => {
                  const isExpanded = expandedId === set.id
                  const upcoming = nextHoliday(set, today)
                  const label = `${set.countryName} ${set.year}`
                  return (
                    <Fragment key={set.id}>
                      <TableRow className="hover:bg-primary/5">
                        <TableCell className="pl-6">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : set.id)}
                            aria-expanded={isExpanded}
                            className="group flex items-center gap-2 text-left font-medium"
                          >
                            <ChevronDownIcon
                              className={cn(
                                "size-4 text-muted-foreground transition-transform",
                                !isExpanded && "-rotate-90"
                              )}
                            />
                            <span className="group-hover:text-primary">{set.countryName}</span>
                          </button>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {set.year === currentYear ? (
                            <Badge variant="outline" className="border-primary/30 text-primary">
                              {set.year}
                            </Badge>
                          ) : (
                            set.year
                          )}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {upcoming ? (
                            <span>
                              <span className="font-medium text-foreground tabular-nums">
                                {formatHolidayDate(upcoming)}
                              </span>{" "}
                              · {upcoming.title || "Untitled"}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{set.holidays.length}</TableCell>
                        <TableCell className="pr-6 text-right">
                          {canManage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${label}`}>
                                    <MoreHorizontalIcon />
                                  </Button>
                                }
                              />
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={() => openSheet(set)}>
                                  <PencilIcon />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setArchive({ open: true, holidaySet: set })}
                                >
                                  <ArchiveIcon />
                                  Archive
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={5} className="px-6 py-4">
                            {set.holidays.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No holidays saved in this list.</p>
                            ) : (
                              <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                                {set.holidays.map((entry) => (
                                  <li key={`${entry.month}-${entry.day}`} className="flex items-baseline gap-3 text-sm">
                                    <span className="w-14 shrink-0 font-medium text-primary tabular-nums">
                                      {formatHolidayDate(entry)}
                                    </span>
                                    <span className="truncate">{entry.title || "Untitled"}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canManage && (
        <>
          <HolidayFormSheet
            open={sheet.open}
            holidaySet={sheet.holidaySet}
            formKey={sheet.key}
            onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
          />
          <ArchiveHolidayDialog
            open={archive.open}
            holidaySet={archive.holidaySet}
            onOpenChange={(open) => setArchive((current) => ({ ...current, open }))}
          />
        </>
      )}
    </div>
  )
}
