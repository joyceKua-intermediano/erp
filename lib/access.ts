import "server-only"
import type { ClusterScope } from "./clusters"
import { ADMIN_ROLE_NAME } from "./permissions"
import { prisma } from "./prisma"

export type UserAccess = {
  role: string | null
  permissions: string[]
  clusters: ClusterScope
}

export async function getUserAccess(userId: bigint): Promise<UserAccess | null> {
  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        roles: {
          select: {
            name: true,
            all_clusters: true,
            role_permissions: { select: { permissions: { select: { name: true } } } },
            role_clusters: { select: { intermediano_company_id: true } },
          },
        },
      },
    })

    if (!user) return null

    const role = user.roles
    return {
      role: role?.name ?? null,
      permissions: role?.role_permissions.map((link) => link.permissions.name) ?? [],
      clusters: !role
        ? []
        : role.name === ADMIN_ROLE_NAME || role.all_clusters
          ? "all"
          : role.role_clusters.map((link) => link.intermediano_company_id.toString()),
    }
  } catch (error) {
    console.error("getUserAccess failed", { userId: userId.toString(), error })
    throw new Error("Could not load user access.")
  }
}
