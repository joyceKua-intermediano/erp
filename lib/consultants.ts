import { z } from "zod"

export type Consultant = {
  id: string
  name: string
  countryId: string
  countryName: string
  email: string | null
  mobileNumber: string | null
  address: string | null
  employer: string | null
  dateOfBirth: string | null
  employeeCount: number
  createdAt: string | null
}

export const consultantIdSchema = z.string().regex(/^\d+$/, "Invalid consultant id.")

const optionalText = (label: string, max = 255) => z.string().trim().max(max, `${label} is too long.`)

export const consultantFormSchema = z.object({
  name: z.string().trim().min(1, "Enter the consultant's name.").max(255, "Name is too long."),
  countryId: z.string().regex(/^\d+$/, "Choose a country."),
  employer: optionalText("Employer"),
  dateOfBirth: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a valid date.")
    .refine((value) => value === "" || new Date(`${value}T00:00:00Z`) <= new Date(), "Date of birth can't be in the future."),
  email: optionalText("Email")
    .toLowerCase()
    .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email."),
  mobileNumber: optionalText("Mobile number"),
  address: optionalText("Address", 2000),
})

export type ConsultantFormInput = z.input<typeof consultantFormSchema>

export function toConsultantFormInput(consultant: Consultant | null): ConsultantFormInput {
  return {
    name: consultant?.name ?? "",
    countryId: consultant?.countryId ?? "",
    employer: consultant?.employer ?? "",
    dateOfBirth: consultant?.dateOfBirth ?? "",
    email: consultant?.email ?? "",
    mobileNumber: consultant?.mobileNumber ?? "",
    address: consultant?.address ?? "",
  }
}
