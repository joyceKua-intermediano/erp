import { z } from "zod"
import type { Cluster } from "./clusters"
import { permissionNames, type PermissionName } from "./permissions"

export type RoleSummary = {
  id: string
  name: string
  description: string | null
  userCount: number
  permissions: PermissionName[]
  allClusters: boolean
  clusters: Pick<Cluster, "id" | "label">[]
  isProtected: boolean
}

export type RoleMember = {
  id: string
  name: string
  email: string
}

export type RoleDetail = RoleSummary & {
  members: RoleMember[]
}

export const roleIdSchema = z.string().regex(/^\d+$/, "Invalid role id.")

export const roleFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .toLowerCase()
      .min(2, "Role name needs at least 2 characters.")
      .max(100, "Role name is too long."),
    description: z
      .string()
      .trim()
      .max(255, "Description is too long.")
      .transform((value) => value || null),
    permissions: z.array(z.enum(permissionNames as [PermissionName, ...PermissionName[]])),
    allClusters: z.boolean(),
    clusterIds: z.array(z.string().regex(/^\d+$/, "Invalid cluster id.")),
  })
  .refine((role) => role.allClusters || role.clusterIds.length > 0, {
    message: "Pick at least one cluster, or allow all clusters.",
    path: ["clusterIds"],
  })

export type RoleFormInput = z.input<typeof roleFormSchema>
