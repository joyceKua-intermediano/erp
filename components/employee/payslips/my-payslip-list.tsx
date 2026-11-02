"use client"

import { DownloadIcon, RefreshCwIcon } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { myPayslipFileUrl, useMyPayslips } from "@/hooks/use-employee-payslips"

function formatUploadedAt(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value))
}

const headClassName = "text-xs font-semibold tracking-wide text-primary uppercase"

export function MyPayslipList() {
  const { data, isPending, isError, refetch } = useMyPayslips()
  const payslips = data ?? []

  return (
    <Card className="animate-in gap-0 py-0 duration-300 fade-in-0 slide-in-from-bottom-2">
      <CardHeader className="gap-1 border-b py-5">
        <CardTitle>My payslips</CardTitle>
        <CardDescription>
          {isPending
            ? "Loading…"
            : payslips.length === 0
              ? "Payslips appear here once HR uploads them."
              : `${payslips.length} ${payslips.length === 1 ? "payslip" : "payslips"}, newest period first.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader className="bg-primary/5">
            <TableRow className="hover:bg-transparent">
              <TableHead className={`pl-6 ${headClassName}`}>Period</TableHead>
              <TableHead className={`hidden sm:table-cell ${headClassName}`}>File</TableHead>
              <TableHead className={`hidden md:table-cell ${headClassName}`}>Uploaded</TableHead>
              <TableHead className={`pr-6 text-right ${headClassName}`}>Download</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 3 }, (_, index) => (
                <TableRow key={index}>
                  <TableCell className="pl-6">
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="pr-6">
                    <Skeleton className="ml-auto h-7 w-7" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="py-12">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <p className="text-sm text-muted-foreground">Your payslips couldn&apos;t be loaded.</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                      <RefreshCwIcon />
                      Try again
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : payslips.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                  You don&apos;t have any payslips yet.
                </TableCell>
              </TableRow>
            ) : (
              payslips.map((payslip) => (
                <TableRow key={payslip.id} className="hover:bg-primary/5">
                  <TableCell className="pl-6 font-medium">{payslip.periodLabel}</TableCell>
                  <TableCell className="hidden max-w-64 truncate text-muted-foreground sm:table-cell">
                    {payslip.fileName}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {formatUploadedAt(payslip.uploadedAt)}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <a
                      href={myPayslipFileUrl(payslip.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                      aria-label={`Open the ${payslip.periodLabel} payslip`}
                    >
                      <DownloadIcon />
                    </a>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
