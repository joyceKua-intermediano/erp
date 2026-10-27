import { z } from "zod"
import { clusterModuleKeySchema, type ClusterModuleKey } from "./cluster-modules"

export type CountryOption = {
  id: string
  name: string
}

export type CompanyRoleAccess = {
  id: string
  name: string
  scope: "all" | "selected"
}

export type IntermedianoCompany = {
  id: string
  name: string
  taxId: string
  countryId: string
  countryName: string
  contactName: string
  email: string
  mobileNumber: string
  address: string
  employeeCount: number
  activeContractCount: number
  staffTrackerCount: number
  roles: CompanyRoleAccess[]
  modules: ClusterModuleKey[]
  createdAt: string | null
}

export const companyModulesSchema = z.array(clusterModuleKeySchema).max(50)

const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} is required.`).max(255, `${label} is too long.`)

export const companyFormSchema = z.object({
  name: requiredText("Legal name"),
  countryId: z.string().regex(/^\d+$/, "Choose a country."),
  taxId: requiredText("Tax ID"),
  contactName: requiredText("Contact name"),
  email: z.string().trim().toLowerCase().max(255, "Email is too long.").pipe(z.email("Enter a valid email.")),
  mobileNumber: requiredText("Mobile number"),
  address: requiredText("Address"),
})

export type CompanyFormInput = z.input<typeof companyFormSchema>

export function toCompanyFormInput(company: IntermedianoCompany | null): CompanyFormInput {
  return {
    name: company?.name ?? "",
    countryId: company?.countryId ?? "",
    taxId: company?.taxId ?? "",
    contactName: company?.contactName ?? "",
    email: company?.email ?? "",
    mobileNumber: company?.mobileNumber ?? "",
    address: company?.address ?? "",
  }
}
