"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarClockIcon,
  FileSignatureIcon,
  FolderOpenIcon,
  LayoutDashboardIcon,
  ReceiptIcon,
  UserRoundIcon,
} from "lucide-react"
import { cn } from "cn"
import { AppLogo } from "@/components/brand/app-logo"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { MobileNavSheet } from "@/components/layout/mobile-nav-sheet"
import { isActivePath, type NavItem } from "@/lib/navigation"

const employeeNavItems: NavItem[] = [
  { title: "Overview", href: "/employee/dashboard", icon: LayoutDashboardIcon },
  { title: "Profile", href: "/employee/profile", icon: UserRoundIcon },
  { title: "Contract", href: "/employee/contract", icon: FileSignatureIcon },
  { title: "Timesheets", href: "/employee/timesheets", icon: CalendarClockIcon },
  { title: "Payslips", href: "/employee/payslips", icon: ReceiptIcon },
  { title: "Documents", href: "/employee/documents", icon: FolderOpenIcon },
]

type EmployeeShellProps = {
  children: ReactNode
  account?: ReactNode
  profile?: ReactNode
}

export function EmployeeShell({ children, account, profile }: EmployeeShellProps) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-svh flex-col bg-linear-to-b from-muted/50 to-background">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 md:px-8">
          <MobileNavSheet
            sheetId="employee-navigation"
            title="Employee hub"
            description="Your profile, payslips and documents."
            items={employeeNavItems}
            className="lg:hidden"
          />
          <Link href="/employee/dashboard" className="flex items-center gap-2.5">
            <AppLogo />
            <span className="text-sm font-semibold tracking-tight">Intermediano</span>
            <Badge variant="outline" className="hidden sm:inline-flex">
              Employee hub
            </Badge>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            {account}
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 py-10 md:px-8">
        <aside className="hidden w-72 shrink-0 flex-col gap-4 lg:flex">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-4 text-center">
              <Avatar className="size-16">
                <AvatarFallback>
                  <UserRoundIcon className="size-7 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              {profile ?? (
                <div className="flex flex-col gap-1">
                  <span className="text-base font-semibold">My profile</span>
                  <span className="text-sm text-muted-foreground">
                    Personal details, contract and payroll documents
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
          <nav className="flex flex-col gap-1" aria-label="Employee hub">
            {employeeNavItems.map((item) => {
              const active = isActivePath(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground",
                    active && "bg-background text-foreground shadow-sm ring-1 ring-foreground/10",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.title}
                </Link>
              )
            })}
          </nav>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col gap-8">{children}</main>
      </div>
    </div>
  )
}
