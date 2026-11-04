import {
  ADMIN_ROLE_NAME,
  normalizePermissionNames,
  permissionNames,
  permissionResourceActions,
  type PermissionAction,
  type PermissionName,
  type PermissionResource,
} from "../../lib/permissions"

// Copied from the legacy database (intermediano.roles, permissions, role_has_permissions; Spatie guard "web").
export const legacyRoleGrants: Record<string, readonly string[]> = {
  Admin: [
    "Add User", "Show User", "List User", "Edit User", "Delete User",
    "Add Lead", "Show Lead", "List Lead", "Edit Lead", "Delete Lead",
    "Add Company", "Show Company", "List Company", "Edit Company", "Delete Company",
    "Add Contact", "Show Contact", "List Contact", "Edit Contact", "Delete Contact",
    "Show Gate Intermediano Inc", "Show Intermediano Chile SPA", "Show Intermediano Colombia SAS",
    "Show Intermediano SRL CR", "Show Intermediano do Brasil Ltda", "Show Intermediano Ecuador SAS",
    "Show Intermediano Hong Kong Limited", "Show Intermediano Mexico SA de CV", "Show Intermediano Peru SAC",
    "Show Intermediano SAS UY", "Show Investment", "Show Administration", "Show Country", "Show Partner",
    "Show StaffTracker", "Show Intermediano Global Services Ltda",
  ],
  "Business Developer": [
    "Delete User",
    "Add Lead", "Show Lead", "List Lead", "Edit Lead", "Delete Lead",
    "Add Company", "Show Company", "List Company", "Edit Company",
    "Add Contact", "Show Contact", "List Contact", "Edit Contact",
    "Show Lead Registration", "Show Company Registration", "Show Pipeline",
  ],
  User: [
    "Add Lead", "Show Lead", "List Lead",
    "Add Company", "Show Company", "List Company", "Edit Company",
    "Add Contact", "Show Contact", "List Contact", "Edit Contact",
    "Show Gate Intermediano Inc", "Show Intermediano Chile SPA", "Show Intermediano Colombia SAS",
    "Show Intermediano SRL CR", "Show Intermediano do Brasil Ltda", "Show Intermediano Ecuador SAS",
    "Show Intermediano Hong Kong Limited", "Show Intermediano Mexico SA de CV", "Show Intermediano Peru SAC",
    "Show Intermediano SAS UY", "Show Administration", "Show Partner", "Show StaffTracker",
  ],
  Coordinator: [
    "Add Company", "Show Company", "List Company", "Edit Company", "Delete Company",
    "Add Contact", "Show Contact", "List Contact", "Edit Contact", "Delete Contact",
    "Show Gate Intermediano Inc", "Show Intermediano Chile SPA", "Show Intermediano Colombia SAS",
    "Show Intermediano SRL CR", "Show Intermediano do Brasil Ltda", "Show Intermediano Ecuador SAS",
    "Show Intermediano Hong Kong Limited", "Show Intermediano Mexico SA de CV", "Show Intermediano Peru SAC",
    "Show Intermediano SAS UY", "Show Administration",
  ],
  Management: [
    "Add Lead", "Show Lead", "List Lead", "Edit Lead", "Delete Lead",
    "Add Company", "Show Company", "List Company", "Edit Company", "Delete Company",
    "Add Contact", "Show Contact", "List Contact", "Edit Contact", "Delete Contact",
    "Show Gate Intermediano Inc", "Show Intermediano Chile SPA", "Show Intermediano Colombia SAS",
    "Show Intermediano SRL CR", "Show Intermediano do Brasil Ltda", "Show Intermediano Ecuador SAS",
    "Show Intermediano Hong Kong Limited", "Show Intermediano Mexico SA de CV", "Show Intermediano Peru SAC",
    "Show Intermediano SAS UY",
  ],
  "Costa Rica Representative": ["Show Intermediano SRL CR"],
}

const legacyEntityResources: Record<string, PermissionResource> = {
  User: "users",
  Lead: "leads",
  Company: "companies",
  Contact: "contacts",
}

const legacyVerbActions: Record<string, PermissionAction> = {
  Add: "create",
  Show: "show",
  List: "list",
  Edit: "edit",
  Delete: "delete",
}

// Legacy Filament resources had no policies, so each flag opened every action of the resources behind it.
const legacyModuleResources: Record<string, readonly PermissionResource[]> = {
  "Show Administration": ["vacancies", "consultants", "intermediano_companies", "templates", "holidays", "portal_accounts"],
  "Show Country": ["settings"],
  "Show Investment": ["investments"],
  "Show Partner": ["partners"],
}

// Navigation shortcuts already covered by the lead and company grants, or modules the new app doesn't have yet.
const legacyIgnored = new Set(["Show Pipeline", "Show Lead Registration", "Show Company Registration", "Show StaffTracker"])

// `name` only disambiguates countries with more than one entity (Brazil).
export type LegacyCluster = { country: string; name?: string }

export const legacyClusters: Record<string, LegacyCluster> = {
  "Show Gate Intermediano Inc": { country: "Canada" },
  "Show Intermediano Chile SPA": { country: "Chile" },
  "Show Intermediano Colombia SAS": { country: "Colombia" },
  "Show Intermediano SRL CR": { country: "Costa Rica" },
  "Show Intermediano do Brasil Ltda": { country: "Brazil", name: "Intermediano do Brasil Ltda" },
  "Show Intermediano Global Services Ltda": { country: "Brazil", name: "Intermediano Global Services Ltda" },
  "Show Intermediano Ecuador SAS": { country: "Ecuador" },
  "Show Intermediano Hong Kong Limited": { country: "Hong Kong" },
  "Show Intermediano Mexico SA de CV": { country: "Mexico" },
  "Show Intermediano Peru SAC": { country: "Peru" },
  "Show Intermediano SAS UY": { country: "Uruguay" },
}

// A legacy cluster opened everything inside it.
const clusterWorkspaceResources: readonly PermissionResource[] = [
  "quotations", "employees", "contracts", "timesheets", "vacations", "expenses", "payroll", "payslips",
]

export type RoleSeed = {
  name: string
  allClusters: boolean
  clusters: LegacyCluster[]
  permissions: PermissionName[]
}

function allActions(resources: readonly PermissionResource[]): PermissionName[] {
  return resources.flatMap((resource) =>
    permissionResourceActions[resource].map((action) => `${resource}.${action}` as PermissionName),
  )
}

function parseCrud(legacyName: string) {
  const [verb, entity, ...rest] = legacyName.split(" ")
  const resource = legacyEntityResources[entity]
  const action = legacyVerbActions[verb]
  if (rest.length > 0 || !resource || !action) return null
  return { entity, permission: `${resource}.${permissionResourceActions[resource].includes(action) ? action : "list"}` as PermissionName }
}

function toRoleSeed(legacyRole: string, legacyPermissions: readonly string[]): RoleSeed {
  if (legacyRole === "Admin") {
    return { name: ADMIN_ROLE_NAME, allClusters: true, clusters: [], permissions: [...permissionNames] }
  }

  const granted = new Set(legacyPermissions)
  const permissions: PermissionName[] = []
  const clusters: LegacyCluster[] = []

  for (const legacyName of legacyPermissions) {
    if (legacyIgnored.has(legacyName)) continue
    const cluster = legacyClusters[legacyName]
    if (cluster) {
      clusters.push(cluster)
      continue
    }
    const moduleResources = legacyModuleResources[legacyName]
    if (moduleResources) {
      permissions.push(...allActions(moduleResources))
      continue
    }
    const crud = parseCrud(legacyName)
    if (crud) {
      // Without "List <entity>" the legacy resource was unreachable, so its other actions never applied.
      if (granted.has(`List ${crud.entity}`)) permissions.push(crud.permission)
      continue
    }
    throw new Error(`Legacy permission "${legacyName}" on role "${legacyRole}" has no mapping.`)
  }

  if (clusters.length > 0) permissions.push(...allActions(clusterWorkspaceResources))

  return { name: legacyRole, allClusters: false, clusters, permissions: normalizePermissionNames(permissions) }
}

export const legacyRoles: RoleSeed[] = Object.entries(legacyRoleGrants).map(([role, grants]) => toRoleSeed(role, grants))
