import { z } from "zod"

// Portal accounts and employees are legacy rows that Laravel's Filament panels still sign in, so passwords
// must stay in the bcrypt format Laravel checks.

export const MIN_PASSWORD_LENGTH = 8

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(200, "Password is too long.")

export const passwordResetSchema = z.object({ password: passwordSchema })

export type PasswordResetInput = z.input<typeof passwordResetSchema>

// bcryptjs writes $2b$; Laravel's bcrypt check only accepts $2y$, which is the same algorithm.
export function toLaravelBcrypt(hash: string) {
  return hash.startsWith("$2b$") || hash.startsWith("$2a$") ? `$2y$${hash.slice(4)}` : hash
}

// Without look-alike characters (0/O, 1/l/I), since admins read these out or retype them.
const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const PASSWORD_GROUPS = 3
const PASSWORD_GROUP_LENGTH = 4

export function generatePassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(PASSWORD_GROUPS * PASSWORD_GROUP_LENGTH))
  const characters = Array.from(bytes, (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length])
  return Array.from({ length: PASSWORD_GROUPS }, (_, group) =>
    characters.slice(group * PASSWORD_GROUP_LENGTH, (group + 1) * PASSWORD_GROUP_LENGTH).join("")
  ).join("-")
}
