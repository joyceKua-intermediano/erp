import "server-only"
import NextAuth, { type Profile, type Session, type User } from "next-auth"
import Google from "next-auth/providers/google"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { connection } from "next/server"
import { getUserAccess } from "./access"
import { canAccessCluster, clusterIdSchema } from "./clusters"
import { env, isGoogleEnabled } from "./env"
import { hasPermission, type PermissionName } from "./permissions"
import { prisma } from "./prisma"

const ACCESS_REFRESH_MS = 5 * 60 * 1000

function resolveEmail(user: User | undefined, profile: Profile | undefined) {
  const preferredUsername = typeof profile?.preferred_username === "string" ? profile.preferred_username : null
  const email = user?.email ?? profile?.email ?? preferredUsername
  return email?.trim().toLowerCase() || null
}

async function findUserIdByEmail(email: string) {
  try {
    const user = await prisma.users.findUnique({ where: { email }, select: { id: true } })
    return user?.id ?? null
  } catch (error) {
    console.error("findUserIdByEmail failed", { error })
    return null
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    MicrosoftEntraID({
      clientId: env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
    ...(isGoogleEnabled
      ? [Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET })]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile?.email_verified !== true) return false

      const email = resolveEmail(user, profile)
      if (!email) return false

      return (await findUserIdByEmail(email)) !== null
    },

    async jwt({ token, user, profile, trigger }) {
      if (trigger === "signIn") {
        const email = resolveEmail(user, profile)
        const userId = email ? await findUserIdByEmail(email) : null
        if (!userId) return null

        token.userId = userId.toString()
        token.email = email
        token.accessCheckedAt = 0
        // Entra returns the profile photo as a base64 data URL, which would bloat the session cookie.
        delete token.picture
      }

      if (!token.userId) return null
      // Tokens issued before cluster scoping existed have no `clusters`, so refresh them right away.
      const isFresh = Date.now() - (token.accessCheckedAt ?? 0) < ACCESS_REFRESH_MS
      if (isFresh && token.clusters !== undefined) return token

      try {
        const access = await getUserAccess(BigInt(token.userId))
        if (!access) return null

        token.role = access.role
        token.permissions = access.permissions
        token.clusters = access.clusters
        token.accessCheckedAt = Date.now()
      } catch (error) {
        if (trigger === "signIn") throw error
      }

      return token
    },

    session({ session, token }) {
      session.user.id = token.userId ?? ""
      session.user.role = token.role ?? null
      session.user.permissions = token.permissions ?? []
      session.user.clusters = token.clusters ?? []
      return session
    },

    authorized({ auth: session, request }) {
      const { pathname, search } = request.nextUrl
      const isSignedIn = Boolean(session?.user?.id)
      const hasRole = Boolean(session?.user?.role)
      const redirectTo = (path: string) => Response.redirect(new URL(path, request.nextUrl))

      if (pathname.startsWith("/admin")) {
        if (!isSignedIn) {
          const loginUrl = new URL("/login", request.nextUrl)
          loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`)
          return Response.redirect(loginUrl)
        }
        return hasRole ? true : redirectTo("/no-access")
      }

      if (pathname === "/login" && isSignedIn) {
        return redirectTo(hasRole ? "/admin/dashboard" : "/no-access")
      }

      if (pathname === "/no-access") {
        if (!isSignedIn) return redirectTo("/login")
        if (hasRole) return redirectTo("/admin/dashboard")
      }

      return true
    },
  },
})

export async function requireAdminSession(): Promise<Session> {
  let session: Session | null
  try {
    session = await auth()
  } catch (error) {
    console.error("requireAdminSession failed to read session", { error })
    throw new Error("Unauthorized")
  }

  if (!session?.user?.id || !session.user.role) {
    throw new Error("Unauthorized")
  }

  return session
}

export async function getSessionUser(): Promise<Session["user"] | null> {
  // Auth.js re-encrypts the session cookie with crypto.getRandomValues(), which Cache Components only allows at request time.
  await connection()
  try {
    const session = await auth()
    return session?.user?.id ? session.user : null
  } catch (error) {
    console.error("getSessionUser failed to read session", { error })
    return null
  }
}

export async function requirePermission(permission: PermissionName): Promise<Session> {
  const session = await requireAdminSession()

  if (!hasPermission(session.user, permission)) {
    throw new Error("Forbidden")
  }

  return session
}

// Cluster data needs both checks: the module permission and access to that cluster.
export async function requireClusterPermission(
  clusterId: string,
  permission: PermissionName
): Promise<{ session: Session; clusterId: bigint }> {
  const parsedClusterId = clusterIdSchema.safeParse(clusterId)
  if (!parsedClusterId.success) {
    throw new Error("Unknown cluster.")
  }

  const session = await requirePermission(permission)

  if (!canAccessCluster(session.user.clusters, parsedClusterId.data)) {
    throw new Error("Forbidden")
  }

  return { session, clusterId: BigInt(parsedClusterId.data) }
}
