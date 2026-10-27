"use client"

import type { ReactNode } from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useUiStore } from "@/store/use-ui-store"
import { AdminHeader } from "./admin-header"

export function AdminShell({
  children,
  sidebar,
  userMenu,
}: {
  children: ReactNode
  sidebar: ReactNode
  userMenu?: ReactNode
}) {
  const isSidebarOpen = useUiStore((state) => state.isSidebarOpen)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)

  return (
    <SidebarProvider open={isSidebarOpen} onOpenChange={setSidebarOpen}>
      {sidebar}
      <SidebarInset>
        <AdminHeader userMenu={userMenu} />
        <div className="flex flex-1 flex-col gap-8 px-4 pt-8 pb-12 md:px-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
