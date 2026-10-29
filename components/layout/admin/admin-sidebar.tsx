"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2Icon,
  BuildingIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  CoinsIcon,
  FileCodeIcon,
  FileSignatureIcon,
  FileTextIcon,
  HandshakeIcon,
  LayoutDashboardIcon,
  PlaneIcon,
  ShieldCheckIcon,
  UserSearchIcon,
  UsersIcon,
} from "lucide-react"
import { AppLogo } from "@/components/brand/app-logo"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useActiveCluster } from "@/hooks/use-clusters"
import type { ClusterModuleKey } from "@/lib/cluster-modules"
import { isActivePath, type NavItem } from "@/lib/navigation"
import type { PermissionName } from "@/lib/permissions"

type GatedNavItem = NavItem & { permission?: PermissionName }
type ClusterNavItem = NavItem & { permission: PermissionName; module: ClusterModuleKey }

const overviewItems: GatedNavItem[] = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboardIcon },
]

// Only modules with a page in the new app are listed; add Expenses here once it's built.
const clusterItems: ClusterNavItem[] = [
  { title: "Quotations", href: "/admin/quotations", icon: FileTextIcon, permission: "quotations.view", module: "quotations" },
  { title: "Employees", href: "/admin/employees", icon: UsersIcon, permission: "employees.view", module: "employees" },
  { title: "Contracts", href: "/admin/contracts", icon: FileSignatureIcon, permission: "contracts.view", module: "contracts" },
  { title: "Timesheets", href: "/admin/timesheets", icon: CalendarClockIcon, permission: "timesheets.view", module: "timesheets" },
  { title: "Vacations", href: "/admin/vacations", icon: PlaneIcon, permission: "employees.view", module: "employees" },
  { title: "Payroll", href: "/admin/payroll", icon: CoinsIcon, permission: "payroll.view", module: "payroll" },
]

const sharedGroups: { label: string; items: GatedNavItem[] }[] = [
  {
    label: "Sales",
    items: [
      { title: "Companies", href: "/admin/companies", icon: Building2Icon, permission: "companies.view" },
      { title: "Partners", href: "/admin/partners", icon: HandshakeIcon, permission: "partners.view" },
    ],
  },
  {
    label: "Recruitment",
    items: [{ title: "Consultants", href: "/admin/consultants", icon: UserSearchIcon, permission: "consultants.view" }],
  },
  {
    label: "Settings",
    items: [
      {
        title: "Intermediano companies",
        href: "/admin/intermediano-companies",
        icon: BuildingIcon,
        permission: "intermediano_companies.view",
      },
      { title: "Contract templates", href: "/admin/templates", icon: FileCodeIcon, permission: "settings.view" },
      { title: "Holidays", href: "/admin/holidays", icon: CalendarDaysIcon, permission: "settings.view" },
      { title: "Users & roles", href: "/admin/users", icon: ShieldCheckIcon, permission: "users.view" },
    ],
  },
]

function NavGroup({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
  if (items.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={isActivePath(pathname, item.href)}
                tooltip={item.title}
                render={<Link href={item.href} />}
              >
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function AdminSidebar({ permissions }: { permissions: readonly string[] }) {
  const pathname = usePathname()
  const activeCluster = useActiveCluster()
  const clusterLabel = activeCluster?.label ?? "Cluster workspace"

  const isPermitted = (item: GatedNavItem) => !item.permission || permissions.includes(item.permission)
  // With no cluster chosen, the base items stay visible so their pages can prompt for a cluster.
  const visibleClusterItems = clusterItems.filter(
    (item) => isPermitted(item) && (!activeCluster || activeCluster.modules.includes(item.module))
  )

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="px-3 pt-4 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/admin/dashboard" />}>
              <AppLogo />
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-semibold">Intermediano</span>
                <span className="text-xs text-muted-foreground">Admin console</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-2 px-1">
        <NavGroup label="Overview" items={overviewItems.filter(isPermitted)} pathname={pathname} />
        <NavGroup label={clusterLabel} items={visibleClusterItems} pathname={pathname} />
        {sharedGroups.map((group) => (
          <NavGroup key={group.label} label={group.label} items={group.items.filter(isPermitted)} pathname={pathname} />
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
