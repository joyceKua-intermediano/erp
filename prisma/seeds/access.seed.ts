import type { Prisma } from "../../lib/generated/prisma/client"
import { permissionNames } from "../../lib/permissions"
import { ids, timestamps } from "./ids"

export const permissions = permissionNames.map((name, index) => ({
  id: BigInt(index + 1),
  name,
  description: null,
  ...timestamps,
})) satisfies Prisma.permissionsCreateManyInput[]

export const roles = [
  { id: ids.role.admin, name: "admin", description: "Full access to every module", all_clusters: true, ...timestamps },
  {
    id: ids.role.sales,
    name: "sales",
    description: "Leads, companies, contacts and quotations",
    all_clusters: false,
    ...timestamps,
  },
] satisfies Prisma.rolesCreateManyInput[]

export const roleClusters = [
  { role_id: ids.role.sales, intermediano_company_id: ids.intermedianoCompany.colombia },
] satisfies Prisma.role_clustersCreateManyInput[]

const salesPermissions = new Set([
  "leads.view",
  "leads.manage",
  "companies.view",
  "contacts.view",
  "quotations.view",
  "quotations.manage",
])

export const rolePermissions = [
  ...permissions.map((permission) => ({ role_id: ids.role.admin, permission_id: permission.id })),
  ...permissions
    .filter((permission) => salesPermissions.has(permission.name))
    .map((permission) => ({ role_id: ids.role.sales, permission_id: permission.id })),
] satisfies Prisma.role_permissionsCreateManyInput[]
