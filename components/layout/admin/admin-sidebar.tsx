"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BriefcaseBusinessIcon,
  Building2Icon,
  CalendarClockIcon,
  CoinsIcon,
  FileSignatureIcon,
  FileTextIcon,
  HandshakeIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  ShieldCheckIcon,
  TargetIcon,
  UserSearchIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react"
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
import { getCluster } from "@/lib/clusters"
import { isActivePath, type NavItem } from "@/lib/navigation"
import { useUiStore } from "@/store/use-ui-store"

const overviewItems: NavItem[] = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboardIcon },
]

const clusterItems: NavItem[] = [
  { title: "Quotations", href: "/admin/quotations", icon: FileTextIcon },
  { title: "Employees", href: "/admin/employees", icon: UsersIcon },
  { title: "Contracts", href: "/admin/contracts", icon: FileSignatureIcon },
  { title: "Timesheets", href: "/admin/timesheets", icon: CalendarClockIcon },
  { title: "Expenses", href: "/admin/expenses", icon: WalletIcon },
  { title: "Payroll", href: "/admin/payroll", icon: CoinsIcon },
]

const sharedGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Sales",
    items: [
      { title: "Leads", href: "/admin/leads", icon: TargetIcon },
      { title: "Companies", href: "/admin/companies", icon: Building2Icon },
      { title: "Partners", href: "/admin/partners", icon: HandshakeIcon },
    ],
  },
  {
    label: "Recruitment",
    items: [
      { title: "Vacancies", href: "/admin/vacancies", icon: BriefcaseBusinessIcon },
      { title: "Consultants", href: "/admin/consultants", icon: UserSearchIcon },
    ],
  },
  {
    label: "Investments",
    items: [{ title: "Investments", href: "/admin/investments", icon: LandmarkIcon }],
  },
  {
    label: "Settings",
    items: [
      { title: "Users & roles", href: "/admin/users", icon: ShieldCheckIcon },
      { title: "Configuration", href: "/admin/settings", icon: SettingsIcon },
    ],
  },
]

function NavGroup({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
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

export function AdminSidebar() {
  const pathname = usePathname()
  const activeCluster = useUiStore((state) => state.activeCluster)
  const clusterLabel = activeCluster ? getCluster(activeCluster).label : "Cluster workspace"

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="px-3 pt-4 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/admin/dashboard" />}>
              <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                I
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-semibold">Intermediano</span>
                <span className="text-xs text-muted-foreground">Admin console</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-2 px-1">
        <NavGroup label="Overview" items={overviewItems} pathname={pathname} />
        <NavGroup label={clusterLabel} items={clusterItems} pathname={pathname} />
        {sharedGroups.map((group) => (
          <NavGroup key={group.label} label={group.label} items={group.items} pathname={pathname} />
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
