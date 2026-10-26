import { z } from "zod"

export type IndustryFieldOption = {
  id: string
  name: string
}

export type CompanyContact = {
  id: string
  contactName: string
  surname: string | null
  fullName: string
  email: string | null
  linkedin: string | null
  mobile: string | null
  phone: string | null
  position: string | null
  department: string | null
  isMainContact: boolean
}

export type Company = {
  id: string
  name: string
  website: string | null
  vat: string | null
  taxId: string | null
  country: string | null
  state: string | null
  city: string | null
  postalCode: string | null
  address: string | null
  industryFieldId: string | null
  industryName: string | null
  numberOfEmployees: number | null
  isCustomer: boolean
  mainContact: CompanyContact | null
  contactCount: number
  contractCount: number
  leadCount: number
  createdAt: string | null
}

export type CompanyDetail = Company & {
  addedBy: string | null
  contacts: CompanyContact[]
}

export const companyIdSchema = z.string().regex(/^\d+$/, "Invalid company id.")
export const contactIdSchema = z.string().regex(/^\d+$/, "Invalid contact id.")

export const NEW_INDUSTRY_VALUE = "new"

const optionalText = (label: string, max = 255) => z.string().trim().max(max, `${label} is too long.`)

const optionalEmail = optionalText("Email")
  .toLowerCase()
  .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email.")

export const companyFormSchema = z
  .object({
    name: z.string().trim().min(1, "Enter the company name.").max(255, "Name is too long."),
    website: optionalText("Website"),
    vat: optionalText("VAT"),
    taxId: optionalText("Tax ID"),
    country: optionalText("Country"),
    state: optionalText("State"),
    city: optionalText("City"),
    postalCode: optionalText("Postal code"),
    address: optionalText("Address"),
    industryFieldId: z
      .string()
      .refine((value) => value === "" || value === NEW_INDUSTRY_VALUE || /^\d+$/.test(value), "Choose an industry."),
    newIndustryName: optionalText("Industry name"),
    numberOfEmployees: z
      .string()
      .trim()
      .refine((value) => value === "" || /^\d{1,9}$/.test(value), "Enter a whole number."),
    isCustomer: z.boolean(),
  })
  .refine((values) => values.industryFieldId !== NEW_INDUSTRY_VALUE || values.newIndustryName !== "", {
    path: ["newIndustryName"],
    message: "Enter the new industry's name.",
  })

export type CompanyFormInput = z.input<typeof companyFormSchema>

export function toCompanyFormInput(company: Company | null): CompanyFormInput {
  return {
    name: company?.name ?? "",
    website: company?.website ?? "",
    vat: company?.vat ?? "",
    taxId: company?.taxId ?? "",
    country: company?.country ?? "",
    state: company?.state ?? "",
    city: company?.city ?? "",
    postalCode: company?.postalCode ?? "",
    address: company?.address ?? "",
    industryFieldId: company?.industryFieldId ?? "",
    newIndustryName: "",
    numberOfEmployees: company?.numberOfEmployees?.toString() ?? "",
    isCustomer: company?.isCustomer ?? false,
  }
}

export const contactFormSchema = z.object({
  contactName: z.string().trim().min(1, "Enter the contact's name.").max(255, "Name is too long."),
  surname: optionalText("Surname"),
  email: optionalEmail,
  linkedin: optionalText("LinkedIn"),
  mobile: optionalText("Mobile"),
  phone: optionalText("Phone"),
  position: optionalText("Job title"),
  department: optionalText("Department"),
  isMainContact: z.boolean(),
})

export type ContactFormInput = z.input<typeof contactFormSchema>

export function toContactFormInput(contact: CompanyContact | null): ContactFormInput {
  return {
    contactName: contact?.contactName ?? "",
    surname: contact?.surname ?? "",
    email: contact?.email ?? "",
    linkedin: contact?.linkedin ?? "",
    mobile: contact?.mobile ?? "",
    phone: contact?.phone ?? "",
    position: contact?.position ?? "",
    department: contact?.department ?? "",
    isMainContact: contact?.isMainContact ?? false,
  }
}
