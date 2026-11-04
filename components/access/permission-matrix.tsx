"use client"

import {
  BriefcaseBusinessIcon,
  Building2Icon,
  BuildingIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  CoinsIcon,
  ContactIcon,
  FileCodeIcon,
  FileSignatureIcon,
  FileTextIcon,
  HandshakeIcon,
  KeyRoundIcon,
  LandmarkIcon,
  PlaneIcon,
  ReceiptIcon,
  SettingsIcon,
  ShieldCheckIcon,
  TargetIcon,
  UserSearchIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"
import { cn } from "cn"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  permissionActionLabels,
  permissionActions,
  permissionGroups,
  permissionResourceActions,
  permissionResourceLabels,
  toggleAction,
  type PermissionAction,
  type PermissionResource,
  type ResourceGrants,
} from "@/lib/permissions"

export const permissionResourceIcons: Record<PermissionResource, LucideIcon> = {
  quotations: FileTextIcon,
  employees: UsersIcon,
  contracts: FileSignatureIcon,
  timesheets: CalendarClockIcon,
  expenses: WalletIcon,
  payroll: CoinsIcon,
  leads: TargetIcon,
  companies: Building2Icon,
  contacts: ContactIcon,
  partners: HandshakeIcon,
  vacancies: BriefcaseBusinessIcon,
  consultants: UserSearchIcon,
  investments: LandmarkIcon,
  intermediano_companies: BuildingIcon,
  users: ShieldCheckIcon,
  settings: SettingsIcon,
  vacations: PlaneIcon,
  payslips: ReceiptIcon,
  templates: FileCodeIcon,
  holidays: CalendarDaysIcon,
  portal_accounts: KeyRoundIcon,
}

const presets: { label: string; actions: (resource: PermissionResource) => PermissionAction[] }[] = [
  { label: "None", actions: () => [] },
  {
    label: "Read only",
    actions: (resource) => permissionResourceActions[resource].filter((action) => action === "list" || action === "show"),
  },
  { label: "Full access", actions: (resource) => [...permissionResourceActions[resource]] },
]

const columnsClassName = "grid grid-cols-5 gap-1 sm:w-[22rem]"

function sameActions(left: readonly PermissionAction[], right: readonly PermissionAction[]) {
  return left.length === right.length && left.every((action) => right.includes(action))
}

type PermissionMatrixProps = {
  grants: ResourceGrants
  initialGrants?: ResourceGrants
  readOnly?: boolean
  onChange: (resource: PermissionResource, actions: PermissionAction[]) => void
}

export function PermissionMatrix({ grants, initialGrants, readOnly = false, onChange }: PermissionMatrixProps) {
  return (
    <div className="flex flex-col">
      {permissionGroups.map((group) => {
        const grantedCount = group.resources.filter((resource) => grants[resource].length > 0).length

        return (
          <section key={group.label} aria-label={group.label} className="border-b last:border-b-0">
            <div className="flex flex-col gap-2 bg-primary/5 px-6 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-wide text-primary uppercase">{group.label}</span>
                <Badge variant="outline" className="border-primary/20 text-muted-foreground tabular-nums">
                  {grantedCount} of {group.resources.length}
                </Badge>
                {!readOnly && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="xs" className="text-muted-foreground">
                          Set all
                          <ChevronDownIcon />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="start" className="w-36">
                      {presets.map((preset) => (
                        <DropdownMenuItem
                          key={preset.label}
                          onClick={() => group.resources.forEach((resource) => onChange(resource, preset.actions(resource)))}
                        >
                          {preset.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className={cn(columnsClassName, "hidden sm:grid")} aria-hidden>
                {permissionActions.map((action) => (
                  <span key={action} className="text-center text-xs font-medium text-muted-foreground">
                    {permissionActionLabels[action]}
                  </span>
                ))}
              </div>
            </div>
            <ul className="divide-y">
              {group.resources.map((resource) => {
                const Icon = permissionResourceIcons[resource]
                const label = permissionResourceLabels[resource]
                const actions = grants[resource]
                const isChanged = initialGrants !== undefined && !sameActions(initialGrants[resource], actions)

                return (
                  <li
                    key={resource}
                    className={cn(
                      "flex flex-col gap-3 px-6 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between",
                      isChanged && "bg-primary/[0.03]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                      </span>
                      <span className="text-sm font-medium">{label}</span>
                      {isChanged && <span className="size-1.5 rounded-full bg-primary" aria-label="Changed" />}
                    </div>
                    <div className={columnsClassName}>
                      {permissionActions.map((action) => {
                        const actionLabel = permissionActionLabels[action]
                        if (!permissionResourceActions[resource].includes(action)) {
                          return (
                            <span
                              key={action}
                              className="flex flex-col items-center gap-1 text-muted-foreground/50"
                              title={`${label} has no ${actionLabel.toLowerCase()} action`}
                            >
                              <span className="text-[11px] sm:hidden">{actionLabel}</span>
                              <span aria-hidden>–</span>
                            </span>
                          )
                        }
                        return (
                          <label key={action} className="flex cursor-pointer flex-col items-center gap-1 py-0.5">
                            <span className="text-[11px] text-muted-foreground sm:hidden">{actionLabel}</span>
                            <Checkbox
                              checked={actions.includes(action)}
                              disabled={readOnly}
                              onCheckedChange={(checked) => onChange(resource, toggleAction(resource, actions, action, checked))}
                              aria-label={`${label}: ${actionLabel}`}
                            />
                          </label>
                        )
                      })}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
