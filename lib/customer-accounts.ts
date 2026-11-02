import { z } from "zod"
import { listSearchSchema, pageNumberSchema } from "./pagination"

// Portal accounts are legacy `customers` rows. Legacy's Filament portal still signs them in, so passwords
// must stay in the bcrypt format Laravel checks.

export const customerAccountTypes = ["company", "partner"] as const

export type CustomerAccountType = (typeof customerAccountTypes)[number]

export const customerAccountTypeLabels: Record<CustomerAccountType, string> = {
  company: "Company",
  partner: "Partner",
}

export type CustomerAccount = {
  id: string
  type: CustomerAccountType
  companyId: string | null
  companyName: string | null
  partnerId: string | null
  partnerName: string | null
  name: string
  email: string
  archived: boolean
  createdAt: string | null
}

export type CustomerAccountList = {
  // One page of accounts matching the query.
  accounts: CustomerAccount[]
  // How many accounts match the query across all pages.
  total: number
  stats: { active: number; archived: number }
}

export type CustomerAccountOption = { id: string; name: string }

export type CustomerAccountOptions = {
  companies: CustomerAccountOption[]
  partners: CustomerAccountOption[]
}

export const customerAccountStatuses = ["active", "archived"] as const

export type CustomerAccountStatus = (typeof customerAccountStatuses)[number]

export const customerAccountListQuerySchema = z.object({
  page: pageNumberSchema,
  search: listSearchSchema,
  status: z.enum(customerAccountStatuses).catch("active"),
})

export type CustomerAccountListQuery = z.output<typeof customerAccountListQuerySchema>

export const customerAccountIdSchema = z.string().regex(/^\d+$/, "Invalid portal account id.")

const optionalIdSchema = z.union([z.literal(""), z.string().regex(/^\d+$/)])

export const customerAccountFormSchema = z
  .object({
    type: z.enum(customerAccountTypes, "Choose whether this account is for a company or a partner."),
    companyId: optionalIdSchema,
    partnerId: optionalIdSchema,
    name: z.string().trim().min(1, "Enter the person's full name.").max(255, "Name is too long."),
    email: z.string().trim().toLowerCase().max(255, "Email is too long.").pipe(z.email("Enter a valid email.")),
  })
  .superRefine((values, context) => {
    if (values.type === "company" && !values.companyId) {
      context.addIssue({ code: "custom", path: ["companyId"], message: "Choose the company." })
    }
    if (values.type === "partner" && !values.partnerId) {
      context.addIssue({ code: "custom", path: ["partnerId"], message: "Choose the partner." })
    }
  })

export type CustomerAccountFormInput = z.input<typeof customerAccountFormSchema>

export const MIN_PASSWORD_LENGTH = 8

const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(200, "Password is too long.")

export const customerAccountCreateSchema = z.object({
  account: customerAccountFormSchema,
  password: passwordSchema,
})

export type CustomerAccountCreateInput = z.input<typeof customerAccountCreateSchema>

export const passwordResetSchema = z.object({ password: passwordSchema })

export type PasswordResetInput = z.input<typeof passwordResetSchema>

// Only the account's own link is kept, so switching type never leaves both ids set.
export function toAccountLink(values: { type: CustomerAccountType; companyId: string; partnerId: string }) {
  return values.type === "company"
    ? { company_id: BigInt(values.companyId), partner_id: null }
    : { company_id: null, partner_id: BigInt(values.partnerId) }
}

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

export const CUSTOMER_PORTAL_LOGIN_PATH = "/customer/login"
