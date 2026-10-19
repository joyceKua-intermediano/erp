"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ClusterSwitcher } from "@/components/cluster-switcher"
import { ThemeToggle } from "@/components/theme-toggle"

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-20 px-4 pt-4 md:px-8">
      <div className="flex h-16 items-center gap-3 rounded-2xl border bg-background/80 px-3 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/60 md:px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <ClusterSwitcher />
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
