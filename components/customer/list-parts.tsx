"use client"

import type { ComponentType, ReactNode } from "react"
import { RefreshCwIcon, SearchIcon, XIcon } from "lucide-react"
import { cn } from "cn"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"

export const headClassName = "text-xs font-semibold tracking-wide text-primary uppercase"

export function formatSubmittedAt(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value))
}

export function FilterBadge({ isActive, onClick, children }: { isActive: boolean; onClick: () => void; children: string }) {
  return (
    <Badge
      render={<button type="button" onClick={onClick} />}
      aria-pressed={isActive}
      className={cn(
        "cursor-pointer",
        isActive ? "bg-primary text-primary-foreground hover:bg-primary/85" : "bg-primary/10 text-primary hover:bg-primary/15"
      )}
    >
      {children}
    </Badge>
  )
}

export function ClearSearchBadge({ search, onClear }: { search: string; onClear: () => void }) {
  if (!search) return null
  return (
    <Badge render={<button type="button" onClick={onClear} />} variant="outline" className="cursor-pointer gap-1">
      &ldquo;{search}&rdquo;
      <XIcon className="size-3" />
      <span className="sr-only">Clear search</span>
    </Badge>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
}) {
  return (
    <div className="relative w-full sm:w-72">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="pl-8 focus-visible:border-primary focus-visible:ring-primary/25"
      />
    </div>
  )
}

export function ResultCount({
  isPending,
  isFetching,
  total,
  scopeTotal,
}: {
  isPending: boolean
  isFetching: boolean
  total: number
  scopeTotal: number
}) {
  return (
    <>
      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
        {isPending ? "Loading…" : `${total} of ${scopeTotal}`}
      </span>
      {isFetching && !isPending && <RefreshCwIcon className="size-3.5 animate-spin text-primary" aria-label="Refreshing" />}
    </>
  )
}

export type StatItem = { label: string; value: number; icon: ComponentType<{ className?: string }> }

export function StatCards({ stats, isPending, label }: { stats: StatItem[]; isPending: boolean; label: string }) {
  return (
    <section className="grid gap-4 sm:grid-cols-3" aria-label={label}>
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
  )
}

export function SkeletonRows({ columns, rows = 4 }: { columns: number; rows?: number }) {
  return Array.from({ length: rows }, (_, index) => (
    <TableRow key={index}>
      {Array.from({ length: columns }, (_, column) => (
        <TableCell key={column} className={cn(column === 0 && "pl-6", column === columns - 1 && "pr-6")}>
          <Skeleton className="h-4 w-24" />
        </TableCell>
      ))}
    </TableRow>
  ))
}

export function MessageRow({ columns, children }: { columns: number; children: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns} className="py-12 text-center text-sm text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  )
}

export function ErrorRow({ columns, message, onRetry }: { columns: number; message: string; onRetry: () => void }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns} className="py-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">{message}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCwIcon />
            Try again
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
