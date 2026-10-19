"use client"

import type { ReactNode } from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useUiStore } from "@/store/use-ui-store"
import { AdminHeader } from "./admin-header"
import { AdminSidebar } from "./admin-sidebar"

export function AdminShell({ children }: { children: ReactNode }) {
  const isSidebarOpen = useUiStore((state) => state.isSidebarOpen)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)

  return (
    <SidebarProvider open={isSidebarOpen} onOpenChange={setSidebarOpen}>
      <AdminSidebar />
      <SidebarInset>
        <AdminHeader />
        <div className="flex flex-1 flex-col gap-8 px-4 pt-8 pb-12 md:px-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
