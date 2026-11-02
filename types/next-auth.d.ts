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
      // Only set on customer portal sessions, which come from lib/customer-auth.ts.
      customerId?: string
      customerCompanyId?: string
    } & DefaultSession["user"]
  }

  interface User {
    // Returned by the customer portal's credentials provider and copied onto its JWT at sign-in.
    companyId?: string
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
    customerId?: string
    customerCompanyId?: string
  }
}
