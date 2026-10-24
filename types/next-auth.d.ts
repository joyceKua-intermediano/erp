import type { DefaultSession } from "next-auth"
import type { ClusterScope } from "@/lib/clusters"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string | null
      permissions: string[]
      clusters: ClusterScope
    } & DefaultSession["user"]
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string
    role?: string | null
    permissions?: string[]
    clusters?: ClusterScope
    accessCheckedAt?: number
  }
}
