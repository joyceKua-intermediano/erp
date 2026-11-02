import "server-only"
import bcrypt from "bcryptjs"
import NextAuth, { CredentialsSignin, type Session } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { connection } from "next/server"
import { z } from "zod"
import { canUseCustomerPortal } from "./customer-portal"
import { env } from "./env"
import { clearLoginFailures, isLoginLocked, loginAttemptKeys, recordLoginFailure } from "./login-attempts"
import { prisma } from "./prisma"

// Customers (client companies) sign in to their own portal with a session kept apart from the admin
// and employee ones: different routes and cookie names, so no session can be read as another.

export const CUSTOMER_PASSWORD_PROVIDER = "customer-password"
export const CUSTOMER_LOGIN_PATH = "/customer/login"
export const CUSTOMER_HOME_PATH = "/customer/dashboard"
export const CUSTOMER_LOGIN_LOCKED_CODE = "login_locked"
export const PARTNER_ACCOUNT_CODE = "partner_account"

class LoginLocked extends CredentialsSignin {
  code = CUSTOMER_LOGIN_LOCKED_CODE
}

class PartnerAccount extends CredentialsSignin {
  code = PARTNER_ACCOUNT_CODE
}

// How long archiving a customer account can take to end its signed-in session.
const ACCESS_REFRESH_MS = 60 * 1000
// Laravel hashes with 12 rounds, so the decoy compare for unknown emails takes as long as a real one.
const DECOY_ROUNDS = 12
const COOKIE_PREFIX = "intermediano-customer"
const ATTEMPT_PORTAL = "customer"

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

async function findActiveCustomerByEmail(email: string) {
  try {
    return await prisma.customers.findFirst({
      where: { email, deleted_at: null },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        company_id: true,
        companies: { select: { deleted_at: true } },
      },
    })
  } catch (error) {
    console.error("findActiveCustomerByEmail failed", { error })
    return null
  }
}

async function isCustomerActive(customerId: bigint, companyId: bigint) {
  const customer = await prisma.customers.findFirst({
    where: { id: customerId, company_id: companyId, deleted_at: null, companies: { deleted_at: null } },
    select: { id: true },
  })
  return customer !== null
}

export const {
  handlers: customerHandlers,
  auth: customerAuth,
  signIn: customerSignIn,
  signOut: customerSignOut,
} = NextAuth({
  secret: env.AUTH_SECRET,
  basePath: "/api/customer-auth",
  session: { strategy: "jwt" },
  pages: { signIn: CUSTOMER_LOGIN_PATH, error: CUSTOMER_LOGIN_PATH },
  logger: {
    // A mistyped password is expected, not a server fault, so it isn't logged as one.
    error(error) {
      if (error instanceof CredentialsSignin || error.name === "CredentialsSignin") return
      console.error("[customer-auth]", error)
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
      id: CUSTOMER_PASSWORD_PROVIDER,
      name: "Email and password",
      credentials: { email: {}, password: {} },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        // A failing limiter must never lock everyone out, so its errors only skip the limit.
        const attemptKeys = loginAttemptKeys(parsed.data.email, request, ATTEMPT_PORTAL)
        try {
          if (await isLoginLocked(attemptKeys)) throw new LoginLocked()
        } catch (error) {
          if (error instanceof LoginLocked) throw error
          console.error("login rate limit check failed", { error })
        }

        const customer = await findActiveCustomerByEmail(parsed.data.email)
        const isValid = await verifyPassword(parsed.data.password, customer?.password ?? null)

        try {
          if (customer && isValid) await clearLoginFailures(attemptKeys)
          else await recordLoginFailure(attemptKeys)
        } catch (error) {
          console.error("login rate limit update failed", { error })
        }
        if (!customer || !isValid) return null

        // Partner accounts only reach this point with the right password, so refusing them reveals nothing new.
        if (!canUseCustomerPortal(customer)) throw new PartnerAccount()

        return {
          id: customer.id.toString(),
          name: customer.name,
          email: customer.email,
          companyId: customer.company_id!.toString(),
        }
      },
    }),
  ],
  callbacks: {
    signIn({ user, account }) {
      return account?.provider === CUSTOMER_PASSWORD_PROVIDER && Boolean(user?.id)
    },

    async jwt({ token, user, trigger }) {
      if (trigger === "signIn") {
        const companyId = user?.companyId
        if (!user?.id || !companyId) return null

        token.customerId = user.id
        token.customerCompanyId = companyId
        token.accessCheckedAt = Date.now()
        return token
      }

      if (!token.customerId || !token.customerCompanyId) return null
      if (Date.now() - (token.accessCheckedAt ?? 0) < ACCESS_REFRESH_MS) return token

      try {
        if (!(await isCustomerActive(BigInt(token.customerId), BigInt(token.customerCompanyId)))) return null
        token.accessCheckedAt = Date.now()
      } catch (error) {
        console.error("customer session refresh failed", { error })
      }
      return token
    },

    session({ session, token }) {
      session.user.id = token.customerId ?? ""
      session.user.customerId = token.customerId
      session.user.customerCompanyId = token.customerCompanyId
      // Customer sessions never carry admin access, so admin guards reject them outright.
      session.user.role = null
      session.user.permissions = []
      session.user.clusters = []
      return session
    },

    authorized({ auth: session, request }) {
      const { pathname, search } = request.nextUrl
      const isSignedIn = Boolean(session?.user?.customerId)

      if (pathname === CUSTOMER_LOGIN_PATH) {
        return isSignedIn ? Response.redirect(new URL(CUSTOMER_HOME_PATH, request.nextUrl)) : true
      }
      if (!isSignedIn) {
        const loginUrl = new URL(CUSTOMER_LOGIN_PATH, request.nextUrl)
        loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`)
        return Response.redirect(loginUrl)
      }
      return true
    },
  },
})

export type CustomerSessionUser = Session["user"] & { customerId: string; customerCompanyId: string }

export async function getCustomerSessionUser(): Promise<CustomerSessionUser | null> {
  // Auth.js re-encrypts the session cookie with crypto.getRandomValues(), which Cache Components only allows at request time.
  await connection()
  try {
    const session = await customerAuth()
    const customerId = session?.user?.customerId
    const customerCompanyId = session?.user?.customerCompanyId
    return customerId && customerCompanyId ? { ...session.user, customerId, customerCompanyId } : null
  } catch (error) {
    console.error("getCustomerSessionUser failed to read session", { error })
    return null
  }
}

export async function requireCustomerSession(): Promise<{
  customerId: bigint
  companyId: bigint
  user: CustomerSessionUser
}> {
  let session: Session | null
  try {
    session = await customerAuth()
  } catch (error) {
    console.error("requireCustomerSession failed to read session", { error })
    throw new Error("Unauthorized")
  }

  const customerId = session?.user?.customerId
  const customerCompanyId = session?.user?.customerCompanyId
  if (!session || !customerId || !customerCompanyId || !/^\d+$/.test(customerId) || !/^\d+$/.test(customerCompanyId)) {
    throw new Error("Unauthorized")
  }

  return {
    customerId: BigInt(customerId),
    companyId: BigInt(customerCompanyId),
    user: { ...session.user, customerId, customerCompanyId },
  }
}
