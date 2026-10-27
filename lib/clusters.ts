import { z } from "zod"
import type { ClusterModuleKey } from "./cluster-modules"

export type ClusterId = string

export type Cluster = {
  id: ClusterId
  label: string
  modules: ClusterModuleKey[]
}

export type ClusterOption = Omit<Cluster, "modules"> & {
  country: string
}

// "all" also covers clusters created after the role was saved.
export type ClusterScope = "all" | ClusterId[]

export const clusterIdSchema = z.string().regex(/^\d+$/, "Invalid cluster id.")

export function canAccessCluster(scope: ClusterScope, clusterId: ClusterId) {
  return scope === "all" || scope.includes(clusterId)
}

// Prisma ignores an undefined filter, so "all" leaves the query unscoped.
export function clusterIdFilter(scope: ClusterScope): { in: bigint[] } | undefined {
  return scope === "all" ? undefined : { in: scope.map((id) => BigInt(id)) }
}
