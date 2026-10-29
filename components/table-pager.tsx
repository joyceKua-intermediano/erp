"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PAGE_SIZE, pageCount } from "@/lib/pagination"

type TablePagerProps = {
  page: number
  total: number
  onPageChange: (page: number) => void
  isFetching?: boolean
}

export function TablePager({ page, total, onPageChange, isFetching = false }: TablePagerProps) {
  const pages = pageCount(total)
  if (total <= PAGE_SIZE && page === 1) return null

  const first = total === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + 1, total)
  const last = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="flex items-center justify-between gap-3 border-t px-6 py-3 text-xs text-muted-foreground">
      <span className="tabular-nums">
        {first}–{last} of {total}
      </span>
      <div className="flex items-center gap-2">
        <span className="tabular-nums">
          Page {Math.min(page, pages)} of {pages}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Previous page"
          disabled={page <= 1 || isFetching}
          onClick={() => onPageChange(Math.min(page - 1, pages))}
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Next page"
          disabled={page >= pages || isFetching}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  )
}
