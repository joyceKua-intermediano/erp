import type { DefaultSession } from "next-auth"
import type { ClusterScope } from "@/lib/clusters"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string | null
      permissions: string[]
      clusters: ClusterScope
      // Only set on employee portal sessions, which come from lib/employee-auth.ts.
      employeeId?: string
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
    employeeId?: string
  }
}
