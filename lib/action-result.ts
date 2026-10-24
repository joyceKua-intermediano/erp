// Mutations return their failures instead of throwing, because Next.js replaces thrown
// Server Action messages with a generic error in production builds.
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

export function unwrapActionResult<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new Error(result.error)
  return result.data
}
