"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarClockIcon,
  FileSignatureIcon,
  LayoutDashboardIcon,
  PalmtreeIcon,
  ReceiptTextIcon,
  WalletIcon,
} from "lucide-react"
import { cn } from "cn"
import { AppLogo } from "@/components/brand/app-logo"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { MobileNavSheet } from "@/components/layout/mobile-nav-sheet"
import { isActivePath, type NavItem } from "@/lib/navigation"

const customerNavItems: NavItem[] = [
  { title: "Overview", href: "/customer/dashboard", icon: LayoutDashboardIcon },
  { title: "Contracts", href: "/customer/contracts", icon: FileSignatureIcon },
  { title: "Invoices", href: "/customer/invoices", icon: ReceiptTextIcon },
  { title: "Timesheets", href: "/customer/timesheets", icon: CalendarClockIcon },
  { title: "Expenses", href: "/customer/expenses", icon: WalletIcon },
  { title: "Vacations", href: "/customer/vacations", icon: PalmtreeIcon },
]

export function CustomerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 md:px-8">
          <MobileNavSheet
            sheetId="customer-navigation"
            title="Client portal"
            description="Contracts, invoices and approvals."
            items={customerNavItems}
            className="lg:hidden"
          />
          <Link href="/customer/dashboard" className="flex items-center gap-2.5">
            <AppLogo />
            <span className="text-sm font-semibold tracking-tight">Intermediano</span>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Client portal
            </Badge>
          </Link>
          <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Client portal">
            {customerNavItems.map((item) => {
              const active = isActivePath(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                    active && "bg-muted text-foreground",
                  )}
                >
                  {item.title}
                </Link>
              )
            })}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 md:px-8">
        {children}
      </main>
    </div>
  )
}
