import type { Prisma } from "../../lib/generated/prisma/client"
import { permissionNames, type PermissionName } from "../../lib/permissions"
import { ids, timestamps } from "./ids"

export const permissions = permissionNames.map((name) => ({
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

const salesPermissions: PermissionName[] = [
  "leads.list",
  "leads.show",
  "leads.create",
  "leads.edit",
  "leads.delete",
  "companies.list",
  "companies.show",
  "contacts.list",
  "quotations.list",
  "quotations.show",
  "quotations.create",
  "quotations.edit",
  "quotations.delete",
]

// Permission ids come from the database, so grants are listed by name and resolved while seeding.
export const roleGrants: { role_id: bigint; permissions: readonly PermissionName[] }[] = [
  { role_id: ids.role.admin, permissions: permissionNames },
  { role_id: ids.role.sales, permissions: salesPermissions },
]
