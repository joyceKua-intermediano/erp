"use client"

import { useState } from "react"
import { ClockIcon, FileDownIcon, FileSignatureIcon, FileTextIcon, ShieldCheckIcon } from "lucide-react"
import { ContractKindBadge, SignatureBadges } from "@/components/contracts/contract-badges"
import {
  ClearSearchBadge,
  ErrorRow,
  FilterBadge,
  headClassName,
  MessageRow,
  ResultCount,
  SearchInput,
  SkeletonRows,
  StatCards,
} from "@/components/customer/list-parts"
import { ContractStatusBadge, formatContractDate } from "@/components/employees/contract-status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePager } from "@/components/table-pager"
import { useCustomerContracts } from "@/hooks/use-customer-contracts"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { contractKindLabels } from "@/lib/contracts"
import { customerContractKinds, customerContractPdfUrl, type CustomerContractKind } from "@/lib/customer-portal"
import { SEARCH_DEBOUNCE_MS } from "@/lib/pagination"

const COLUMNS = 6

export function CustomerContractList() {
  const [search, setSearch] = useState("")
  const [kind, setKind] = useState<CustomerContractKind | null>(null)
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const { data, isPending, isError, isFetching, refetch } = useCustomerContracts({ page, search: debouncedSearch, kind })

  const contracts = data?.contracts ?? []
  const scopeTotal = data?.stats.contracts ?? 0

  // Any change to the filters starts again from the first page.
  function updateFilters(apply: () => void) {
    apply()
    setPage(1)
  }

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      <StatCards
        label="Contract summary"
        isPending={isPending}
        stats={[
          { label: "Contracts", value: scopeTotal, icon: FileTextIcon },
          { label: "Active", value: data?.stats.active ?? 0, icon: ShieldCheckIcon },
          { label: "Pending signature", value: data?.stats.pendingSignature ?? 0, icon: ClockIcon },
        ]}
      />

      <Card className="gap-0 py-0">
        <CardHeader className="gap-4 border-b py-5 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-1">
            <CardTitle>Contracts</CardTitle>
            <CardDescription>Your service agreements with Intermediano and your placed staff&apos;s contracts.</CardDescription>
          </div>
          <SearchInput
            value={search}
            onChange={(value) => updateFilters(() => setSearch(value))}
            placeholder="Search employee or job title…"
            label="Search contracts"
          />
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <FilterBadge isActive={kind === null} onClick={() => updateFilters(() => setKind(null))}>
              All contracts
            </FilterBadge>
            {customerContractKinds.map((option) => (
              <FilterBadge key={option} isActive={kind === option} onClick={() => updateFilters(() => setKind(option))}>
                {contractKindLabels[option]}
              </FilterBadge>
            ))}
            <ClearSearchBadge search={search.trim()} onClear={() => updateFilters(() => setSearch(""))} />
            <ResultCount isPending={isPending} isFetching={isFetching} total={data?.total ?? 0} scopeTotal={scopeTotal} />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow className="hover:bg-transparent">
                <TableHead className={`pl-6 ${headClassName}`}>Employee</TableHead>
                <TableHead className={`hidden md:table-cell ${headClassName}`}>Type</TableHead>
                <TableHead className={`hidden lg:table-cell ${headClassName}`}>Period</TableHead>
                <TableHead className={headClassName}>Status</TableHead>
                <TableHead className={`hidden xl:table-cell ${headClassName}`}>Signatures</TableHead>
                <TableHead className="w-14 pr-6">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody key={isPending ? "loading" : "ready"} className="animate-in duration-300 fade-in-0">
              {isPending ? (
                <SkeletonRows columns={COLUMNS} />
              ) : isError ? (
                <ErrorRow columns={COLUMNS} message="Your contracts couldn't be loaded." onRetry={() => refetch()} />
              ) : contracts.length === 0 ? (
                <MessageRow columns={COLUMNS}>
                  {scopeTotal === 0 ? "You don't have any contracts yet." : "No contracts match your filters."}
                </MessageRow>
              ) : (
                contracts.map((contract) => (
                  <TableRow key={contract.id} className="hover:bg-primary/5">
                    <TableCell className="pl-6">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{contract.employeeName}</span>
                        <span className="text-xs text-muted-foreground">{contract.jobTitle ?? "No job title"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <ContractKindBadge kind={contract.kind} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {formatContractDate(contract.startDate)} – {contract.endDate ? formatContractDate(contract.endDate) : "Open-ended"}
                    </TableCell>
                    <TableCell>
                      <ContractStatusBadge status={contract.status} />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <SignatureBadges
                        kind={contract.kind}
                        employeeSigned={contract.employeeSigned}
                        adminSigned={contract.adminSigned}
                      />
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {contract.hasTemplate ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-sm" aria-label={`Open ${contract.employeeName}'s contract`}>
                                <FileSignatureIcon />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem render={<a href={customerContractPdfUrl(contract.id)} target="_blank" rel="noreferrer" />}>
                              <FileTextIcon />
                              View PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem render={<a href={customerContractPdfUrl(contract.id, true)} download />}>
                              <FileDownIcon />
                              Download PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-xs text-muted-foreground">No PDF</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {data && <TablePager page={page} total={data.total} onPageChange={setPage} isFetching={isFetching} />}
        </CardContent>
      </Card>
    </div>
  )
}
