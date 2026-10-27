import { z } from "zod"

export const partnerTypes = ["commercial", "operational", "both"] as const

export type PartnerType = (typeof partnerTypes)[number]

export const partnerTypeLabels: Record<PartnerType, string> = {
  commercial: "Commercial",
  operational: "Operational",
  both: "Both",
}

export function isPartnerType(value: string | null): value is PartnerType {
  return partnerTypes.includes(value as PartnerType)
}

// Values saved outside the legacy options (e.g. "Payroll") are shown as-is rather than hidden.
export function partnerTypeLabel(value: string | null) {
  if (!value) return null
  return isPartnerType(value) ? partnerTypeLabels[value] : value
}

export type Partner = {
  id: string
  name: string
  partnerType: string | null
  countryId: string
  countryName: string | null
  contactName: string | null
  email: string
  mobileNumber: string
  taxId: string | null
  address: string
  contractCount: number
  portalAccountCount: number
  createdAt: string | null
}

export const partnerIdSchema = z.string().regex(/^\d+$/, "Invalid partner id.")

const requiredText = (message: string, label: string, max = 255) =>
  z.string().trim().min(1, message).max(max, `${label} is too long.`)

export const partnerFormSchema = z.object({
  name: requiredText("Enter the partner's company name.", "Name"),
  countryId: z.string().regex(/^\d+$/, "Choose a country."),
  partnerType: requiredText("Choose a partner type.", "Partner type"),
  contactName: requiredText("Enter a contact name.", "Contact name"),
  email: requiredText("Enter an email.", "Email")
    .toLowerCase()
    .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email."),
  mobileNumber: requiredText("Enter a mobile number.", "Mobile number"),
  taxId: requiredText("Enter the tax ID.", "Tax ID"),
  address: requiredText("Enter the address.", "Address", 2000),
})

export type PartnerFormInput = z.input<typeof partnerFormSchema>

export function toPartnerFormInput(partner: Partner | null): PartnerFormInput {
  return {
    name: partner?.name ?? "",
    countryId: partner?.countryId ?? "",
    partnerType: partner?.partnerType ?? "",
    contactName: partner?.contactName ?? "",
    email: partner?.email ?? "",
    mobileNumber: partner?.mobileNumber ?? "",
    taxId: partner?.taxId ?? "",
    address: partner?.address ?? "",
  }
}
