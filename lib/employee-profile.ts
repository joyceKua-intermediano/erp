import { z } from "zod"
import type { ContractKind } from "./contracts"
import type { ContractStatus } from "./employees"

// One personal_information row (with its dependents and emergency contact) and one documents row (with its files,
// banking detail and social security info) per employee. Legacy can hold several; the latest by id is the one used,
// the same as contract rendering.

export const genderSuggestions = ["Male", "Female"] as const
export const civilStatusSuggestions = ["Single", "Married", "Widow"] as const

export const educationAttainmentOptions = [
  { value: "High school", label: "High school" },
  { value: "College", label: "College" },
  { value: "MBA", label: "MBA" },
  { value: "Doctorate", label: "Doctorate" },
] as const

export const educationStatusOptions = [
  { value: "complete", label: "Complete" },
  { value: "incomplete", label: "Incomplete" },
] as const

export const accountTypeOptions = [
  { value: "Savings", label: "Savings" },
  { value: "Checking", label: "Checking" },
] as const

export const documentTypes = [
  "photo_3x4",
  "copy_of_id",
  "copy_of_tax_id",
  "copy_of_voter_registration",
  "no_record_of_pis",
  "copy_of_registration_certificate",
  "copy_of_birth_or_marriage_certificate",
  "copy_of_work_permit",
  "proof_of_residency",
  "copy_of_birth_certificate_of_children",
  "medical_admission_exam",
] as const

export type DocumentType = (typeof documentTypes)[number]

export const documentTypeLabels: Record<DocumentType, string> = {
  photo_3x4: "3x4 photo",
  copy_of_id: "Copy of ID",
  copy_of_tax_id: "Copy of tax ID",
  copy_of_voter_registration: "Copy of voter registration",
  no_record_of_pis: "No record of PIS",
  copy_of_registration_certificate: "Copy of registration certificate",
  copy_of_birth_or_marriage_certificate: "Copy of birth or marriage certificate",
  copy_of_work_permit: "Copy of work permit",
  proof_of_residency: "Proof of residency",
  copy_of_birth_certificate_of_children: "Copy of birth certificate of children",
  medical_admission_exam: "Medical admission exam",
}

export function documentTypeLabel(value: string) {
  return (documentTypeLabels as Record<string, string>)[value] ?? value
}

// Social security numbers, each with the column that holds its file.
export const socialSecurityFields = [
  { key: "healthFund", fileKey: "healthFundFile", column: "health_fund_file", label: "Health fund" },
  { key: "pensionFund", fileKey: "pensionFundFile", column: "pension_fund_file", label: "Pension fund" },
  { key: "severanceFund", fileKey: "severanceFundFile", column: "severance_fund_file", label: "Severance fund" },
  { key: "curp", fileKey: "curpFile", column: "curp_file", label: "CURP" },
  {
    key: "socialSecurityNumber",
    fileKey: "socialSecurityFile",
    column: "social_security_file",
    label: "Social security number",
  },
  { key: "voterId", fileKey: "voterIdFile", column: "voter_id_file", label: "Voter ID" },
] as const

export type SocialSecurityFileColumn = (typeof socialSecurityFields)[number]["column"]

export function isSocialSecurityFileColumn(value: string): value is SocialSecurityFileColumn {
  return socialSecurityFields.some((field) => field.column === value)
}

const text = (label: string, max = 255) => z.string().trim().max(max, `${label} is too long.`)
const dateText = (label: string) =>
  z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `Enter a valid ${label}.`)])

export const MAX_DEPENDENTS = 20
export const MAX_DOCUMENT_FILES = 30

export const dependentSchema = z.object({
  fullName: text("Dependent name").min(1, "Enter each dependent's name, or remove the row."),
  relationship: text("Relationship"),
  dateOfBirth: dateText("dependent's date of birth"),
  taxId: text("Dependent tax ID"),
})

export const profileFormSchema = z.object({
  gender: text("Gender", 10).min(1, "Enter your gender."),
  civilStatus: text("Civil status").min(1, "Enter your civil status."),
  dateOfBirth: dateText("date of birth"),
  nationality: text("Nationality"),
  address: text("Address"),
  city: text("City"),
  state: text("State"),
  country: text("Country"),
  postalCode: text("Postal code"),
  phone: text("Phone"),
  mobile: text("Mobile"),
  educationAttainment: text("Education attainment").min(1, "Choose your education attainment."),
  educationStatus: text("Education status").min(1, "Choose your education status."),
  // Stored in `is_local`, which legacy labels "Expat": Yes stores 1.
  expat: z.enum(["yes", "no"], "Choose whether you're an expat."),
  passportNumber: text("Passport number"),
  workVisa: text("Work visa"),
  numberOfDependents: z.union([z.literal(""), z.string().regex(/^\d{1,2}$/, "Enter the number of dependents.")]),
  dependents: z.array(dependentSchema).max(MAX_DEPENDENTS, `You can list at most ${MAX_DEPENDENTS} dependents.`),
  emergencyContact: z.object({
    name: text("Emergency contact name").min(1, "Enter your emergency contact's name."),
    relationship: text("Emergency contact relationship").min(1, "Enter your emergency contact's relationship."),
    mobile: text("Emergency contact mobile").min(1, "Enter your emergency contact's mobile number."),
    email: text("Emergency contact email")
      .min(1, "Enter your emergency contact's email.")
      .pipe(z.email("Enter a valid email for your emergency contact.")),
  }),
})

// The expat choice starts empty on a new profile, so the form may hold "" until the schema rejects it.
export type ProfileFormInput = Omit<z.input<typeof profileFormSchema>, "expat"> & { expat: "yes" | "no" | "" }
export type ProfileFormValues = z.output<typeof profileFormSchema>

export const documentFileSchema = z.object({
  documentType: z.enum(documentTypes, "Choose a type for each file."),
  path: z.string().trim().min(1, "Upload a file for each document, or remove the row.").max(255),
  fileName: text("File name"),
})

const fileRef = z.string().trim().max(255)

export const documentsFormSchema = z.object({
  personalId: text("Personal ID"),
  organism: text("Organism"),
  taxId: text("Tax ID"),
  expiration: dateText("expiration date"),
  other: text("Other"),
  category: text("Category"),
  hasInsurance: z.boolean(),
  isDriverLicense: z.boolean(),
  files: z.array(documentFileSchema).max(MAX_DOCUMENT_FILES, `You can keep at most ${MAX_DOCUMENT_FILES} files.`),
  bank: z.object({
    bankName: text("Bank name"),
    bankCode: text("Bank code"),
    branchName: text("Branch name"),
    accountNumber: text("Account number"),
    accountType: text("Account type"),
    currency: text("Account currency"),
  }),
  social: z.object({
    healthFund: text("Health fund"),
    healthFundFile: fileRef,
    pensionFund: text("Pension fund"),
    pensionFundFile: fileRef,
    severanceFund: text("Severance fund"),
    severanceFundFile: fileRef,
    curp: text("CURP"),
    curpFile: fileRef,
    socialSecurityNumber: text("Social security number"),
    socialSecurityFile: fileRef,
    voterId: text("Voter ID"),
    voterIdFile: fileRef,
  }),
})

export type DocumentsFormInput = z.input<typeof documentsFormSchema>
export type DocumentsFormValues = z.output<typeof documentsFormSchema>

export type StoredDocumentFile = {
  id: string
  documentType: string
  path: string
  fileName: string
}

export type EmployeeProfile = {
  hasRecord: boolean
  updatedAt: string | null
  values: ProfileFormInput
}

export type EmployeeDocuments = {
  employeeId: string
  hasRecord: boolean
  updatedAt: string | null
  // Mexico labels the tax ID "Tax ID (RFC)".
  countryName: string | null
  values: DocumentsFormInput
  files: StoredDocumentFile[]
}

export type MyContract = {
  id: string
  kind: ContractKind | null
  jobTitle: string | null
  clientName: string | null
  clusterName: string | null
  countryOfWork: string | null
  startDate: string | null
  endDate: string | null
  status: ContractStatus
  employeeSigned: boolean
  adminSigned: boolean
  // False when no template is attached, so there is no PDF to open.
  hasTemplate: boolean
}

export type EmployeeProfileOverview = {
  profile: EmployeeProfile
  documents: EmployeeDocuments
}

export function emptyProfileValues(): ProfileFormInput {
  return {
    gender: "",
    civilStatus: "",
    dateOfBirth: "",
    nationality: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    phone: "",
    mobile: "",
    educationAttainment: "",
    educationStatus: "",
    expat: "",
    passportNumber: "",
    workVisa: "",
    numberOfDependents: "",
    dependents: [],
    emergencyContact: { name: "", relationship: "", mobile: "", email: "" },
  }
}

export function emptyDocumentsValues(): DocumentsFormInput {
  return {
    personalId: "",
    organism: "",
    taxId: "",
    expiration: "",
    other: "",
    category: "",
    hasInsurance: false,
    isDriverLicense: false,
    files: [],
    bank: { bankName: "", bankCode: "", branchName: "", accountNumber: "", accountType: "", currency: "" },
    social: {
      healthFund: "",
      healthFundFile: "",
      pensionFund: "",
      pensionFundFile: "",
      severanceFund: "",
      severanceFundFile: "",
      curp: "",
      curpFile: "",
      socialSecurityNumber: "",
      socialSecurityFile: "",
      voterId: "",
      voterIdFile: "",
    },
  }
}

export function taxIdLabel(countryName: string | null) {
  const normalized = countryName?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() ?? ""
  return normalized.includes("mexico") ? "Tax ID (RFC)" : "Tax ID"
}

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

export const documentFileTypes = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
} as const

export type DocumentFileType = keyof typeof documentFileTypes

export const DOCUMENT_ACCEPT = [...Object.values(documentFileTypes), ".pdf"].join(",")

const DOCUMENT_DIRECTORY = "employee-documents"

const documentFilePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|png|jpg|webp)$/

export function documentPathFor(employeeId: bigint | string, fileName: string) {
  return `${DOCUMENT_DIRECTORY}/${employeeId}/${fileName}`
}

// A file uploaded through the new app by this employee; legacy files are only accepted when already stored.
export function isEmployeeDocumentPath(path: string, employeeId: bigint | string) {
  const prefix = `${DOCUMENT_DIRECTORY}/${employeeId}/`
  return path.startsWith(prefix) && documentFilePattern.test(path.slice(prefix.length))
}

// Accepted when unchanged from what's stored for this employee, or when it's one of their own new uploads.
export function isAcceptableDocumentPath(path: string, employeeId: bigint | string, storedPaths: ReadonlySet<string>) {
  return storedPaths.has(path) || isEmployeeDocumentPath(path, employeeId)
}

const MAX_FILE_NAME_LENGTH = 200

export function sanitizeDocumentFileName(name: string) {
  const base = (name.split(/[\\/]/).pop() ?? "")
    .replace(/[\u0000-\u001f\u007f"<>|*?:]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return base.slice(0, MAX_FILE_NAME_LENGTH).trim() || "document"
}

export function documentFileUrl(employeeId: string, file: string, clusterId?: string | null) {
  const base = `/api/employee-documents/${employeeId}/${encodeURIComponent(file)}`
  return clusterId ? `${base}?cluster=${encodeURIComponent(clusterId)}` : base
}

export function storedFileRef(fileId: string) {
  return `f-${fileId}`
}

export function expatFromIsLocal(isLocal: boolean): "yes" | "no" {
  return isLocal ? "yes" : "no"
}

export function isLocalFromExpat(expat: "yes" | "no") {
  return expat === "yes"
}
