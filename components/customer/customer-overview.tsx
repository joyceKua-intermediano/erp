"use client"

import Link from "next/link"
import { ArrowRightIcon, CalendarClockIcon, FileSignatureIcon, PalmtreeIcon, RefreshCwIcon, WalletIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useCustomerDashboard } from "@/hooks/use-customer-dashboard"

export function CustomerOverview() {
  const { data, isPending, isError, refetch } = useCustomerDashboard()

  const shortcuts = [
    {
      title: "Timesheets",
      description: "Approve the monthly hours your team submits.",
      href: "/customer/timesheets",
      icon: CalendarClockIcon,
      count: data?.pending.timesheets,
      countLabel: "to review",
    },
    {
      title: "Vacations",
      description: "Respond to time off requested by your staff.",
      href: "/customer/vacations",
      icon: PalmtreeIcon,
      count: data?.pending.vacations,
      countLabel: "to review",
    },
    {
      title: "Expenses",
      description: "Review expenses your team submits for reimbursement.",
      href: "/customer/expenses",
      icon: WalletIcon,
      count: data?.pending.expenses,
      countLabel: "to review",
    },
    {
      title: "Contracts",
      description: "Your service agreements and your placed staff's contracts.",
      href: "/customer/contracts",
      icon: FileSignatureIcon,
      count: data?.activeContracts,
      countLabel: "active",
    },
  ]

  return (
    <>
      <Card className="bg-linear-to-br from-primary to-primary/80 text-primary-foreground ring-0 [--card-spacing:--spacing(8)]">
        <CardContent className="flex flex-col gap-2">
          <span className="text-xs font-medium tracking-wider uppercase opacity-80">Client portal</span>
          {isPending ? (
            <Skeleton className="h-8 w-64 bg-primary-foreground/20" />
          ) : (
            <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
              {data ? `Welcome, ${data.companyName}` : "Welcome back"}
            </h1>
          )}
          <p className="max-w-xl text-sm opacity-80">
            Everything about the team Intermediano manages for you, from contracts to timesheet, vacation and expense
            approvals, in one place.
          </p>
        </CardContent>
      </Card>
      {isError && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          Your pending approvals couldn&apos;t be loaded.
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCwIcon />
            Try again
          </Button>
        </div>
      )}
      <h2 className="font-heading text-lg font-semibold tracking-tight">Where would you like to start?</h2>
      <section className="grid gap-4 sm:grid-cols-2" aria-label="Shortcuts">
        {shortcuts.map((shortcut) => (
          <Link
            key={shortcut.href}
            href={shortcut.href}
            className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Card className="h-full transition-shadow group-hover:shadow-md [--card-spacing:--spacing(6)]">
              <CardHeader>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
                    <shortcut.icon className="size-5" />
                  </span>
                  {isPending ? (
                    <Skeleton className="h-5 w-20 rounded-full" />
                  ) : (
                    shortcut.count !== undefined && (
                      <Badge
                        variant="outline"
                        className={shortcut.countLabel === "to review" && shortcut.count > 0 ? "border-primary/30 text-primary" : ""}
                      >
                        {shortcut.count} {shortcut.countLabel}
                      </Badge>
                    )
                  )}
                </div>
                <CardTitle className="flex items-center gap-2">
                  {shortcut.title}
                  <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardTitle>
                <CardDescription>{shortcut.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>
    </>
  )
}
