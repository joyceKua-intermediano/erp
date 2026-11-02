"use client"

import { useState } from "react"
import Link from "next/link"
import { ArchiveIcon, Building2Icon, HandshakeIcon, PlusIcon, RefreshCwIcon, SearchIcon, UserCheckIcon, XIcon } from "lucide-react"
import { cn } from "cn"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePager } from "@/components/table-pager"
import { useCustomerAccounts } from "@/hooks/use-customer-accounts"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { CUSTOMER_PORTAL_LOGIN_PATH, type CustomerAccount, type CustomerAccountStatus } from "@/lib/customer-accounts"
import { SEARCH_DEBOUNCE_MS } from "@/lib/pagination"
import { CustomerAccountActions, CustomerAccountStatusBadge } from "./customer-account-actions"
import { useCustomerAccountDialogs } from "./use-customer-account-dialogs"

const headClassName = "text-xs font-semibold tracking-wide text-primary uppercase"

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" })

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "—"
}

export function AccountOwner({ account }: { account: CustomerAccount }) {
  if (account.type === "partner") {
    return (
      <span className="flex items-center gap-1.5">
        <HandshakeIcon className="size-3.5 text-muted-foreground" />
        {account.partnerName ?? "Unknown partner"}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5">
      <Building2Icon className="size-3.5 text-muted-foreground" />
      {account.companyId ? (
        <Link href={`/admin/companies/${account.companyId}`} className="hover:text-primary hover:underline">
          {account.companyName ?? "Unknown company"}
        </Link>
      ) : (
        "No company"
      )}
    </span>
  )
}

const statusFilters: { value: CustomerAccountStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
]

export function CustomerAccountsWorkspace({ canManage }: { canManage: boolean }) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<CustomerAccountStatus>("active")
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const { data, isPending, isError, isFetching, refetch } = useCustomerAccounts({ page, search: debouncedSearch, status })
  const { openCreate, handlers, dialogs } = useCustomerAccountDialogs()

  const accounts = data?.accounts ?? []
  const trimmedSearch = search.trim()
  const statusTotal = status === "active" ? (data?.stats.active ?? 0) : (data?.stats.archived ?? 0)

  // Any change to the filters starts again from the first page.
  function updateFilters(apply: () => void) {
    apply()
    setPage(1)
  }

  const stats = [
    { label: "Active accounts", value: data?.stats.active ?? 0, icon: UserCheckIcon },
    { label: "Archived accounts", value: data?.stats.archived ?? 0, icon: ArchiveIcon },
  ]

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      <section className="grid gap-4 sm:grid-cols-2" aria-label="Portal accounts summary">
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
            <CardTitle>Portal accounts</CardTitle>
            <CardDescription>People at client companies and partners who can sign in to the Client portal.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => updateFilters(() => setSearch(event.target.value))}
                placeholder="Search name, email, company…"
                aria-label="Search portal accounts"
                className="pl-8 focus-visible:border-primary focus-visible:ring-primary/25"
              />
            </div>
            {canManage && (
              <Button onClick={openCreate}>
                <PlusIcon />
                Add account
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            {statusFilters.map((filter) => {
              const isActive = status === filter.value
              return (
                <Badge
                  key={filter.value}
                  render={<button type="button" onClick={() => updateFilters(() => setStatus(filter.value))} />}
                  aria-pressed={isActive}
                  className={cn(
                    "cursor-pointer",
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
                render={<button type="button" onClick={() => updateFilters(() => setSearch(""))} />}
                variant="outline"
                className="cursor-pointer gap-1"
              >
                &ldquo;{trimmedSearch}&rdquo;
                <XIcon className="size-3" />
                <span className="sr-only">Clear search</span>
              </Badge>
            )}
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {isPending ? "Loading…" : `${data?.total ?? 0} of ${statusTotal}`}
            </span>
            {isFetching && !isPending && (
              <RefreshCwIcon className="size-3.5 animate-spin text-primary" aria-label="Refreshing" />
            )}
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {isError ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">Portal accounts couldn&apos;t be loaded.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCwIcon />
                Try again
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className={`pl-6 ${headClassName}`}>Account</TableHead>
                  <TableHead className={`hidden md:table-cell ${headClassName}`}>Belongs to</TableHead>
                  <TableHead className={headClassName}>Status</TableHead>
                  <TableHead className={`hidden lg:table-cell ${headClassName}`}>Added</TableHead>
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
                        <div className="flex flex-col gap-1.5">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-36" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell className="pr-6" />
                    </TableRow>
                  ))
                ) : accounts.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                      {statusTotal === 0
                        ? status === "active"
                          ? "No portal accounts yet."
                          : "No archived portal accounts."
                        : "No portal accounts match your search."}
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((account) => (
                    <TableRow key={account.id} className="hover:bg-primary/5">
                      <TableCell className="pl-6">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{account.name}</span>
                          <span className="text-xs text-muted-foreground">{account.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        <AccountOwner account={account} />
                      </TableCell>
                      <TableCell>
                        <CustomerAccountStatusBadge archived={account.archived} />
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground tabular-nums lg:table-cell">
                        {formatDate(account.createdAt)}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        {canManage && <CustomerAccountActions account={account} handlers={handlers} />}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          {data && <TablePager page={page} total={data.total} onPageChange={setPage} isFetching={isFetching} />}
        </CardContent>
        <CardFooter className="px-6 py-3 text-xs text-muted-foreground">
          Customers sign in at {CUSTOMER_PORTAL_LOGIN_PATH}. Archived accounts are signed out within a minute.
        </CardFooter>
      </Card>

      {canManage && dialogs}
    </div>
  )
}
