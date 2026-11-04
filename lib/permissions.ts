// Rows in `permissions` are matched by name, so renaming a resource or action orphans every grant that uses it.
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
  "vacations",
  "payslips",
  "templates",
  "holidays",
  "portal_accounts",
] as const

export const permissionActions = ["list", "show", "create", "edit", "delete"] as const

export type PermissionResource = (typeof permissionResources)[number]
export type PermissionAction = (typeof permissionActions)[number]
export type PermissionName = `${PermissionResource}.${PermissionAction}`

const allActions = permissionActions

// Only actions a module really has are offered; reviewing and approving count as edit, archiving as delete.
export const permissionResourceActions: Record<PermissionResource, readonly PermissionAction[]> = {
  quotations: allActions,
  employees: allActions,
  contracts: allActions,
  timesheets: ["list", "show", "edit"],
  expenses: ["list", "show", "edit"],
  payroll: allActions,
  leads: allActions,
  companies: allActions,
  contacts: ["list", "create", "edit", "delete"],
  partners: allActions,
  vacancies: allActions,
  consultants: allActions,
  investments: allActions,
  users: ["list", "create", "edit", "delete"],
  settings: ["list", "edit"],
  intermediano_companies: allActions,
  vacations: ["list", "edit"],
  payslips: ["list", "show", "create", "delete"],
  templates: allActions,
  holidays: ["list", "create", "edit", "delete"],
  portal_accounts: ["list", "create", "edit", "delete"],
}

export const permissionActionLabels: Record<PermissionAction, string> = {
  list: "List",
  show: "Show",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
}

export const permissionNames = permissionResources.flatMap((resource) =>
  permissionResourceActions[resource].map((action) => `${resource}.${action}` as PermissionName)
)

export const ADMIN_ROLE_NAME = "admin"
export const EDIT_USERS_PERMISSION: PermissionName = "users.edit"

export function hasPermission(user: { permissions: readonly string[] }, permission: PermissionName) {
  return user.permissions.includes(permission)
}

export function hasAnyPermission(user: { permissions: readonly string[] }, permissions: readonly PermissionName[]) {
  return permissions.some((permission) => user.permissions.includes(permission))
}

export type RecordPermissions = { create: boolean; edit: boolean; delete: boolean }

export function recordPermissions(user: { permissions: readonly string[] }, resource: PermissionResource): RecordPermissions {
  return {
    create: hasPermission(user, `${resource}.create`),
    edit: hasPermission(user, `${resource}.edit`),
    delete: hasPermission(user, `${resource}.delete`),
  }
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
  vacations: "Vacations",
  payslips: "Payslips",
  templates: "Contract templates",
  holidays: "Holidays",
  portal_accounts: "Portal accounts",
}

export const permissionGroups: { label: string; resources: PermissionResource[] }[] = [
  {
    label: "Cluster workspace",
    resources: ["quotations", "employees", "contracts", "timesheets", "vacations", "expenses", "payroll", "payslips"],
  },
  { label: "Sales", resources: ["leads", "companies", "contacts", "partners"] },
  { label: "Recruitment", resources: ["vacancies", "consultants"] },
  { label: "Investments", resources: ["investments"] },
  {
    label: "Settings",
    resources: ["intermediano_companies", "templates", "holidays", "users", "portal_accounts", "settings"],
  },
]

export type ResourceGrants = Record<PermissionResource, PermissionAction[]>

// Every action needs the list, and editing a record needs opening it first.
function requiredActions(resource: PermissionResource, action: PermissionAction): PermissionAction[] {
  if (action === "list") return []
  const supportsShow = permissionResourceActions[resource].includes("show")
  return action === "edit" && supportsShow ? ["list", "show"] : ["list"]
}

function sortActions(resource: PermissionResource, actions: Iterable<PermissionAction>) {
  const granted = new Set(actions)
  return permissionResourceActions[resource].filter((action) => granted.has(action))
}

export function withRequiredActions(resource: PermissionResource, actions: readonly PermissionAction[]) {
  return sortActions(resource, actions.flatMap((action) => [action, ...requiredActions(resource, action)]))
}

export function toggleAction(
  resource: PermissionResource,
  actions: readonly PermissionAction[],
  action: PermissionAction,
  granted: boolean
): PermissionAction[] {
  if (granted) return withRequiredActions(resource, [...actions, action])
  return sortActions(
    resource,
    actions.filter((current) => current !== action && !requiredActions(resource, current).includes(action))
  )
}

export function canChangeRecords(actions: readonly PermissionAction[]) {
  return actions.some((action) => action !== "list" && action !== "show")
}

export function toResourceGrants(permissions: readonly string[]): ResourceGrants {
  const granted = new Set(permissions)
  return Object.fromEntries(
    permissionResources.map((resource) => [
      resource,
      permissionResourceActions[resource].filter((action) => granted.has(`${resource}.${action}`)),
    ])
  ) as ResourceGrants
}

export function toPermissionNames(grants: ResourceGrants): PermissionName[] {
  return permissionResources.flatMap((resource) =>
    withRequiredActions(resource, grants[resource]).map((action) => `${resource}.${action}` as PermissionName)
  )
}

export function normalizePermissionNames(permissions: readonly PermissionName[]): PermissionName[] {
  return toPermissionNames(toResourceGrants(permissions))
}
