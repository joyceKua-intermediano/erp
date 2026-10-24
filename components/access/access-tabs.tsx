"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShieldCheckIcon, UsersIcon } from "lucide-react"
import { cn } from "cn"
import { isActivePath } from "@/lib/navigation"

const tabs = [
  { title: "Users", href: "/admin/users", icon: UsersIcon, isActive: (pathname: string) => pathname === "/admin/users" },
  {
    title: "Roles",
    href: "/admin/users/roles",
    icon: ShieldCheckIcon,
    isActive: (pathname: string) => isActivePath(pathname, "/admin/users/roles"),
  },
]

export function AccessTabs() {
  const pathname = usePathname()

  return (
    <nav aria-label="Users and roles" className="inline-flex w-fit items-center gap-1 rounded-xl bg-muted p-1">
      {tabs.map((tab) => {
        const isActive = tab.isActive(pathname)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              isActive && "bg-background text-foreground shadow-sm"
            )}
          >
            <tab.icon className={cn("size-4", isActive && "text-primary")} />
            {tab.title}
          </Link>
        )
      })}
    </nav>
  )
}
