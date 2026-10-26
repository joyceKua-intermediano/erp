// Permission ids are derived from position in the seed, so only append to this list; reordering would remap existing ids.
export const permissionResources = [
  "quotations",
  "employees",
  "contracts",
  "timesheets",
  "expenses",
  "payroll",
  "leads",
  "companies",
  "contacts",
  "partners",
  "vacancies",
  "consultants",
  "investments",
  "users",
  "settings",
  "intermediano_companies",
] as const

export const permissionActions = ["view", "manage"] as const

export type PermissionResource = (typeof permissionResources)[number]
export type PermissionAction = (typeof permissionActions)[number]
export type PermissionName = `${PermissionResource}.${PermissionAction}`
export type AccessLevel = "none" | PermissionAction

export const permissionNames = permissionResources.flatMap((resource) =>
  permissionActions.map((action) => `${resource}.${action}` as PermissionName)
)

export const ADMIN_ROLE_NAME = "admin"
export const MANAGE_USERS_PERMISSION: PermissionName = "users.manage"
export const MANAGE_INTERMEDIANO_COMPANIES_PERMISSION: PermissionName = "intermediano_companies.manage"

export function hasPermission(user: { permissions: readonly string[] }, permission: PermissionName) {
  return user.permissions.includes(permission)
}

export const permissionResourceLabels: Record<PermissionResource, string> = {
  quotations: "Quotations",
  employees: "Employees",
  contracts: "Contracts",
  timesheets: "Timesheets",
  expenses: "Expenses",
  payroll: "Payroll",
  leads: "Leads",
  companies: "Companies",
  contacts: "Contacts",
  partners: "Partners",
  vacancies: "Vacancies",
  consultants: "Consultants",
  investments: "Investments",
  intermediano_companies: "Intermediano Companies",
  users: "Users & roles",
  settings: "Configuration",
}

export const permissionGroups: { label: string; resources: PermissionResource[] }[] = [
  {
    label: "Cluster workspace",
    resources: ["quotations", "employees", "contracts", "timesheets", "expenses", "payroll"],
  },
  { label: "Sales", resources: ["leads", "companies", "contacts", "partners"] },
  { label: "Recruitment", resources: ["vacancies", "consultants"] },
  { label: "Investments", resources: ["investments"] },
  { label: "Settings", resources: ["intermediano_companies", "users", "settings"] },
]

export type AccessLevels = Record<PermissionResource, AccessLevel>

export function toAccessLevels(permissions: readonly string[]): AccessLevels {
  const granted = new Set(permissions)
  return Object.fromEntries(
    permissionResources.map((resource) => {
      const level: AccessLevel = granted.has(`${resource}.manage`)
        ? "manage"
        : granted.has(`${resource}.view`)
          ? "view"
          : "none"
      return [resource, level]
    })
  ) as AccessLevels
}

export function toPermissionNames(levels: AccessLevels): PermissionName[] {
  return permissionResources.flatMap((resource): PermissionName[] => {
    if (levels[resource] === "manage") return [`${resource}.view`, `${resource}.manage`]
    if (levels[resource] === "view") return [`${resource}.view`]
    return []
  })
}
