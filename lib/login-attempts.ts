import "server-only"
import { prisma } from "./prisma"

const WINDOW_MS = 15 * 60 * 1000
const LOCK_MS = 15 * 60 * 1000
const MAX_EMAIL_FAILURES = 5
const MAX_IP_FAILURES = 30

type AttemptKey = { key: string; maxFailures: number }

// Behind a proxy the client address is the first x-forwarded-for entry; without one, only the email is limited.
function clientIp(request: Request | undefined) {
  const forwarded = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || request?.headers.get("x-real-ip")?.trim() || null
}

export function loginAttemptKeys(email: string, request: Request | undefined): AttemptKey[] {
  const ip = clientIp(request)
  return [
    { key: `email:${email}`.slice(0, 191), maxFailures: MAX_EMAIL_FAILURES },
    ...(ip ? [{ key: `ip:${ip}`.slice(0, 191), maxFailures: MAX_IP_FAILURES }] : []),
  ]
}

export async function isLoginLocked(keys: AttemptKey[]): Promise<boolean> {
  const locked = await prisma.login_attempts.findFirst({
    where: { key: { in: keys.map(({ key }) => key) }, locked_until: { gt: new Date() } },
    select: { key: true },
  })
  return locked !== null
}

export async function recordLoginFailure(keys: AttemptKey[]): Promise<void> {
  const now = new Date()
  for (const { key, maxFailures } of keys) {
    const row = await prisma.login_attempts.findUnique({ where: { key } })
    const inWindow = row !== null && now.getTime() - row.window_started_at.getTime() < WINDOW_MS
    const attempts = inWindow ? row.attempts + 1 : 1
    const data = {
      attempts,
      window_started_at: inWindow ? row.window_started_at : now,
      locked_until: attempts >= maxFailures ? new Date(now.getTime() + LOCK_MS) : null,
      updated_at: now,
    }
    await prisma.login_attempts.upsert({ where: { key }, create: { key, ...data }, update: data })
  }
}

// Only the email's counter resets: one working account mustn't clear the limit for an address guessing others.
export async function clearLoginFailures(keys: AttemptKey[]): Promise<void> {
  const emailKeys = keys.filter(({ key }) => key.startsWith("email:")).map(({ key }) => key)
  await prisma.login_attempts.deleteMany({ where: { key: { in: emailKeys } } })
}
