import "server-only"
import bcrypt from "bcryptjs"
import NextAuth, { CredentialsSignin, type Profile, type Session, type User } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { connection } from "next/server"
import { z } from "zod"
import { env, isEmployeeMicrosoftEnabled, isGoogleEnabled } from "./env"
import { clearLoginFailures, isLoginLocked, loginAttemptKeys, recordLoginFailure } from "./login-attempts"
import { prisma } from "./prisma"

// Employees sign in to their own portal with a session kept apart from the admin console's:
// different routes and cookie names, so neither session can be read as the other.

export const EMPLOYEE_PASSWORD_PROVIDER = "employee-password"
export const EMPLOYEE_LOGIN_PATH = "/employee/login"
export const EMPLOYEE_HOME_PATH = "/employee/dashboard"
export const LOGIN_LOCKED_CODE = "login_locked"

class LoginLocked extends CredentialsSignin {
  code = LOGIN_LOCKED_CODE
}

// How long archiving an employee can take to end their signed-in session.
const ACCESS_REFRESH_MS = 60 * 1000
// Laravel hashes with 12 rounds, so the decoy compare for unknown emails takes as long as a real one.
const DECOY_ROUNDS = 12
const COOKIE_PREFIX = "intermediano-employee"

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(200),
})

let decoyHash: Promise<string> | null = null
function getDecoyHash() {
  decoyHash ??= bcrypt.hash("intermediano-decoy-password", DECOY_ROUNDS)
  return decoyHash
}

function isBcryptHash(value: string) {
  return /^\$2[aby]\$\d{2}\$.{53}$/.test(value)
}

async function verifyPassword(password: string, hash: string | null) {
  try {
    if (hash && isBcryptHash(hash)) return await bcrypt.compare(password, hash)
    await bcrypt.compare(password, await getDecoyHash())
    return false
  } catch (error) {
    console.error("verifyPassword failed", { error })
    return false
  }
}

const MICROSOFT_PROVIDER = "microsoft-entra-id"
const GOOGLE_PROVIDER = "google"
// Entra's fixed tenant id for personal Microsoft accounts (Outlook, Hotmail, Live), whose emails Microsoft verifies.
const MICROSOFT_PERSONAL_TENANT_ID = "9188040d-6c67-4c5b-b112-36a304b66dad"
// The admin issuer is tenant-specific, so it names Intermediano's own tenant.
const homeTenantId =
  /microsoftonline\.com\/([^/]+)\/v2\.0/.exec(env.AUTH_MICROSOFT_ENTRA_ID_ISSUER)?.[1]?.toLowerCase() ?? null

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() || null : null
}

function isTrueClaim(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1"
}

// Other organisations' admins can set any `email` on their users, so the employee portal's multi-tenant
// app only trusts it from Intermediano's tenant, personal accounts, or tenants that verified the domain.
function resolveMicrosoftEmail(profile: Profile | undefined) {
  const tenantId = typeof profile?.tid === "string" ? profile.tid.toLowerCase() : null
  if (!profile || !tenantId) return null

  const email = normalizeEmail(profile.email)
  if (homeTenantId && tenantId === homeTenantId) return email ?? normalizeEmail(profile.preferred_username)
  if (tenantId === MICROSOFT_PERSONAL_TENANT_ID) return email
  return isTrueClaim(profile.xms_edov) ? email : null
}

function resolveSsoEmail(provider: string | undefined, user: User | undefined, profile: Profile | undefined) {
  if (provider === MICROSOFT_PROVIDER) return resolveMicrosoftEmail(profile)
  if (provider === GOOGLE_PROVIDER) {
    return profile?.email_verified === true ? normalizeEmail(profile.email ?? user?.email) : null
  }
  return null
}

async function findActiveEmployeeByEmail(email: string) {
  try {
    return await prisma.employees.findFirst({
      where: { email, deleted_at: null },
      select: { id: true, name: true, email: true, password: true },
    })
  } catch (error) {
    console.error("findActiveEmployeeByEmail failed", { error })
    return null
  }
}

async function isEmployeeActive(employeeId: bigint) {
  const employee = await prisma.employees.findFirst({
    where: { id: employeeId, deleted_at: null },
    select: { id: true },
  })
  return employee !== null
}

export const {
  handlers: employeeHandlers,
  auth: employeeAuth,
  signIn: employeeSignIn,
  signOut: employeeSignOut,
} = NextAuth({
  secret: env.AUTH_SECRET,
  basePath: "/api/employee-auth",
  session: { strategy: "jwt" },
  pages: { signIn: EMPLOYEE_LOGIN_PATH, error: EMPLOYEE_LOGIN_PATH },
  logger: {
    // A mistyped password is expected, not a server fault, so it isn't logged as one.
    error(error) {
      if (error instanceof CredentialsSignin || error.name === "CredentialsSignin") return
      console.error("[employee-auth]", error)
    },
  },
  cookies: {
    sessionToken: { name: `${COOKIE_PREFIX}.session-token` },
    callbackUrl: { name: `${COOKIE_PREFIX}.callback-url` },
    csrfToken: { name: `${COOKIE_PREFIX}.csrf-token` },
    pkceCodeVerifier: { name: `${COOKIE_PREFIX}.pkce.code_verifier` },
    state: { name: `${COOKIE_PREFIX}.state` },
    nonce: { name: `${COOKIE_PREFIX}.nonce` },
  },
  providers: [
    Credentials({
      id: EMPLOYEE_PASSWORD_PROVIDER,
      name: "Email and password",
      credentials: { email: {}, password: {} },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        // A failing limiter must never lock everyone out, so its errors only skip the limit.
        const attemptKeys = loginAttemptKeys(parsed.data.email, request)
        try {
          if (await isLoginLocked(attemptKeys)) throw new LoginLocked()
        } catch (error) {
          if (error instanceof LoginLocked) throw error
          console.error("login rate limit check failed", { error })
        }

        const employee = await findActiveEmployeeByEmail(parsed.data.email)
        const isValid = await verifyPassword(parsed.data.password, employee?.password ?? null)

        try {
          if (employee && isValid) await clearLoginFailures(attemptKeys)
          else await recordLoginFailure(attemptKeys)
        } catch (error) {
          console.error("login rate limit update failed", { error })
        }
        if (!employee || !isValid) return null

        return { id: employee.id.toString(), name: employee.name, email: employee.email }
      },
    }),
    ...(isEmployeeMicrosoftEnabled
      ? [
          MicrosoftEntraID({
            clientId: env.AUTH_EMPLOYEE_MICROSOFT_ENTRA_ID_ID,
            clientSecret: env.AUTH_EMPLOYEE_MICROSOFT_ENTRA_ID_SECRET,
            issuer: env.AUTH_EMPLOYEE_MICROSOFT_ENTRA_ID_ISSUER,
          }),
        ]
      : []),
    ...(isGoogleEnabled
      ? [Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET })]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === EMPLOYEE_PASSWORD_PROVIDER) return Boolean(user?.id)

      const email = resolveSsoEmail(account?.provider, user, profile)
      if (!email) return false
      return (await findActiveEmployeeByEmail(email)) !== null
    },

    async jwt({ token, user, account, profile, trigger }) {
      if (trigger === "signIn") {
        let employeeId: string | null = null
        if (account?.provider === EMPLOYEE_PASSWORD_PROVIDER) {
          employeeId = user?.id ?? null
        } else {
          const email = resolveSsoEmail(account?.provider, user, profile)
          const employee = email ? await findActiveEmployeeByEmail(email) : null
          employeeId = employee?.id.toString() ?? null
          if (employee) token.name = employee.name
        }
        if (!employeeId) return null

        token.employeeId = employeeId
        token.accessCheckedAt = Date.now()
        // Entra returns the profile photo as a base64 data URL, which would bloat the session cookie.
        delete token.picture
        return token
      }

      if (!token.employeeId) return null
      if (Date.now() - (token.accessCheckedAt ?? 0) < ACCESS_REFRESH_MS) return token

      try {
        if (!(await isEmployeeActive(BigInt(token.employeeId)))) return null
        token.accessCheckedAt = Date.now()
      } catch (error) {
        console.error("employee session refresh failed", { error })
      }
      return token
    },

    session({ session, token }) {
      session.user.id = token.employeeId ?? ""
      session.user.employeeId = token.employeeId
      // Employee sessions never carry admin access, so admin guards reject them outright.
      session.user.role = null
      session.user.permissions = []
      session.user.clusters = []
      return session
    },

    authorized({ auth: session, request }) {
      const { pathname, search } = request.nextUrl
      const isSignedIn = Boolean(session?.user?.employeeId)

      if (pathname === EMPLOYEE_LOGIN_PATH) {
        return isSignedIn ? Response.redirect(new URL(EMPLOYEE_HOME_PATH, request.nextUrl)) : true
      }
      if (!isSignedIn) {
        const loginUrl = new URL(EMPLOYEE_LOGIN_PATH, request.nextUrl)
        loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`)
        return Response.redirect(loginUrl)
      }
      return true
    },
  },
})

export type EmployeeSessionUser = Session["user"] & { employeeId: string }

export async function getEmployeeSessionUser(): Promise<EmployeeSessionUser | null> {
  // Auth.js re-encrypts the session cookie with crypto.getRandomValues(), which Cache Components only allows at request time.
  await connection()
  try {
    const session = await employeeAuth()
    const employeeId = session?.user?.employeeId
    return employeeId ? { ...session.user, employeeId } : null
  } catch (error) {
    console.error("getEmployeeSessionUser failed to read session", { error })
    return null
  }
}

export async function requireEmployeeSession(): Promise<{ employeeId: bigint; user: EmployeeSessionUser }> {
  let session: Session | null
  try {
    session = await employeeAuth()
  } catch (error) {
    console.error("requireEmployeeSession failed to read session", { error })
    throw new Error("Unauthorized")
  }

  const employeeId = session?.user?.employeeId
  if (!session || !employeeId || !/^\d+$/.test(employeeId)) {
    throw new Error("Unauthorized")
  }

  return { employeeId: BigInt(employeeId), user: { ...session.user, employeeId } }
}
