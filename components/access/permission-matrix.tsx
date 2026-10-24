"use client"

import {
  BriefcaseBusinessIcon,
  Building2Icon,
  BuildingIcon,
  CalendarClockIcon,
  ChevronDownIcon,
  CoinsIcon,
  ContactIcon,
  FileSignatureIcon,
  FileTextIcon,
  HandshakeIcon,
  LandmarkIcon,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  permissionGroups,
  permissionResourceLabels,
  type AccessLevel,
  type AccessLevels,
  type PermissionResource,
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
}

const levelOptions: { value: AccessLevel; label: string; pressedClassName: string }[] = [
  { value: "none", label: "None", pressedClassName: "data-pressed:bg-muted data-pressed:text-foreground" },
  {
    value: "view",
    label: "View",
    pressedClassName: "data-pressed:bg-primary/15 data-pressed:text-primary data-pressed:hover:bg-primary/20",
  },
  {
    value: "manage",
    label: "Manage",
    pressedClassName:
      "data-pressed:bg-primary data-pressed:text-primary-foreground data-pressed:hover:bg-primary/90",
  },
]

type PermissionMatrixProps = {
  levels: AccessLevels
  initialLevels?: AccessLevels
  readOnly?: boolean
  onChange: (resource: PermissionResource, level: AccessLevel) => void
}

export function PermissionMatrix({ levels, initialLevels, readOnly = false, onChange }: PermissionMatrixProps) {
  return (
    <div className="flex flex-col">
      {permissionGroups.map((group) => {
        const grantedCount = group.resources.filter((resource) => levels[resource] !== "none").length

        return (
          <section key={group.label} aria-label={group.label} className="border-b last:border-b-0">
            <div className="flex items-center justify-between gap-3 bg-primary/5 px-6 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-wide text-primary uppercase">{group.label}</span>
                <Badge variant="outline" className="border-primary/20 text-muted-foreground tabular-nums">
                  {grantedCount} of {group.resources.length}
                </Badge>
              </div>
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
                  <DropdownMenuContent align="end" className="w-36">
                    {levelOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => group.resources.forEach((resource) => onChange(resource, option.value))}
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <ul className="divide-y">
              {group.resources.map((resource) => {
                const Icon = permissionResourceIcons[resource]
                const isChanged = initialLevels !== undefined && initialLevels[resource] !== levels[resource]

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
                      <span className="text-sm font-medium">{permissionResourceLabels[resource]}</span>
                      {isChanged && (
                        <span className="size-1.5 rounded-full bg-primary" aria-label="Changed" />
                      )}
                    </div>
                    <ToggleGroup
                      variant="outline"
                      size="sm"
                      spacing={0}
                      value={[levels[resource]]}
                      disabled={readOnly}
                      onValueChange={(values) => {
                        const next = values[0] as AccessLevel | undefined
                        if (next) onChange(resource, next)
                      }}
                      aria-label={`${permissionResourceLabels[resource]} access`}
                    >
                      {levelOptions.map((option) => (
                        <ToggleGroupItem
                          key={option.value}
                          value={option.value}
                          className={cn("min-w-18", option.pressedClassName)}
                        >
                          {option.label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
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
