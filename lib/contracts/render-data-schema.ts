import { z } from "zod"
import { contractKinds } from "@/lib/contracts"

// Templates read this object as `data` (`#let data = json(bytes(sys.inputs.data))`).
// Bump `version` when a field is renamed or removed, because saved templates depend on these paths.

const text = (description: string) => z.string().describe(description)
const optionalText = (description: string) => z.string().nullable().describe(description)

const dateValue = (description: string) =>
  z
    .object({
      iso: text("ISO date, e.g. 2026-02-01"),
      short: text("Day/month/year, e.g. 01/02/2026"),
      long: text("Long date in the cluster's language, e.g. 1 de febrero de 2026"),
      longEn: text("Long date in English, e.g. February 1, 2026"),
    })
    .nullable()
    .describe(description)

const signer = (description: string) =>
  z
    .object({
      title: text("Heading above the signature, e.g. EL EMPLEADOR"),
      name: optionalText("Signer's name"),
      lines: z.array(z.string()).describe("Lines under the name, e.g. company and tax ID"),
      signed: z.boolean().describe("Whether this party has signed"),
      signedAt: optionalText("When this party signed, formatted"),
    })
    .describe(description)

export const contractRenderDataSchema = z.object({
  version: z.literal(1).describe("Data format version"),
  contract: z
    .object({
      number: text("Contract number as year.id, e.g. 2026.0001"),
      kind: z.enum(contractKinds).nullable().describe("employee, customer or partner"),
      jobTitle: optionalText("Job title"),
      translatedPosition: optionalText("Translated job title"),
      countryOfWork: optionalText("Country where the work is done"),
      isIntegral: z.boolean().describe("Colombia: integral salary instead of ordinary"),
      isOpenEnded: z.boolean().describe("True when the contract has no end date"),
      startDate: dateValue("Start date"),
      endDate: dateValue("End date, none when open-ended"),
      createdDate: dateValue("Date the contract was created"),
      jobDescription: optionalText("Job description, blank lines between paragraphs"),
      translatedJobDescription: optionalText("Translated job description"),
      workingHours: optionalText("Standard working hours"),
      shiftSchedule: optionalText("Shift schedule"),
      noticePeriod: optionalText("Notice period"),
      paymentTerms: optionalText("Payment terms"),
    })
    .describe("The contract itself"),
  employee: z
    .object({
      name: text("Full name"),
      printedName: text("Full name in capitals"),
      email: text("Email"),
      personalId: optionalText("National ID number"),
      taxId: optionalText("Tax ID"),
      nationality: optionalText("Nationality"),
      civilStatus: optionalText("Civil status as stored"),
      civilStatusLocal: optionalText("Civil status in the cluster's language"),
      gender: optionalText("Gender as stored"),
      genderLocal: optionalText("Gender in the cluster's language"),
      dateOfBirth: dateValue("Date of birth"),
      age: z.number().nullable().describe("Age in years"),
      phone: optionalText("Phone"),
      mobile: optionalText("Mobile"),
      address: optionalText("Street address"),
      city: optionalText("City"),
      state: optionalText("State or province"),
      country: optionalText("Country of residence"),
      postalCode: optionalText("Postal code"),
      fullAddress: optionalText("Address, city, state, country and postal code in one line"),
      bank: z
        .object({
          name: optionalText("Bank name"),
          code: optionalText("Bank code"),
          accountNumber: optionalText("Account number"),
          accountType: optionalText("Account type"),
        })
        .describe("Payroll bank account"),
      socialSecurity: z
        .object({
          number: optionalText("Social security number"),
          healthFund: optionalText("Health fund"),
          pensionFund: optionalText("Pension fund"),
          severanceFund: optionalText("Severance fund"),
          curp: optionalText("Mexico: CURP"),
          voterId: optionalText("Voter ID"),
        })
        .describe("Social security details"),
      dependents: z
        .array(z.object({ name: text("Dependent's name"), relationship: text("Relationship") }))
        .describe("Dependents, as a list"),
    })
    .describe("The employee"),
  client: z
    .object({
      name: text("Company name"),
      address: optionalText("Street address"),
      city: optionalText("City"),
      state: optionalText("State or province"),
      country: optionalText("Country"),
      taxId: optionalText("Tax ID"),
      contact: z
        .object({
          name: optionalText("Main contact's full name"),
          position: optionalText("Main contact's position"),
          email: optionalText("Main contact's email"),
          phone: optionalText("Main contact's phone"),
        })
        .describe("Main contact"),
    })
    .nullable()
    .describe("The client company, none when the contract has none"),
  cluster: z
    .object({
      legalName: text("Intermediano legal entity name"),
      address: optionalText("Registered address"),
      taxId: optionalText("Tax ID"),
      taxIdLabel: text("Name of the tax ID, e.g. NIT or CNPJ"),
      email: optionalText("Contact email"),
      phone: optionalText("Contact phone"),
      website: optionalText("Website"),
      country: text("Country"),
      language: text("Contract language code: es, pt or en"),
    })
    .describe("The Intermediano legal entity (cluster)"),
  salary: z
    .object({
      amount: z.number().nullable().describe("Gross salary as a number"),
      formatted: optionalText("Gross salary with currency symbol, e.g. $ 6.500.000,00"),
      currencyCode: text("ISO currency code, e.g. COP"),
      currencySymbol: text("Currency symbol"),
      spelledLocal: optionalText("Salary in words, in the cluster's language"),
      spelledEn: optionalText("Salary in words, in English"),
    })
    .describe("Gross salary"),
  signatures: z
    .object({
      employer: signer("The Intermediano signer"),
      employee: signer("The employee, or the client for customer contracts"),
    })
    .describe("Signature blocks"),
})

export type ContractRenderData = z.infer<typeof contractRenderDataSchema>

export type RenderField = {
  path: string
  description: string
  type: "text" | "number" | "yes/no" | "date" | "list" | "group"
  nullable: boolean
}

function unwrap(schema: z.ZodType): { schema: z.ZodType; nullable: boolean } {
  if (schema instanceof z.ZodNullable) return { schema: schema.unwrap() as z.ZodType, nullable: true }
  return { schema, nullable: false }
}

function isDateValue(schema: z.ZodType) {
  return schema instanceof z.ZodObject && "longEn" in schema.shape
}

function collectFields(schema: z.ZodObject, prefix: string, fields: RenderField[]) {
  for (const [key, child] of Object.entries(schema.shape)) {
    const path = `${prefix}.${key}`
    const description = (child as z.ZodType).description ?? ""
    const { schema: inner, nullable } = unwrap(child as z.ZodType)

    if (isDateValue(inner)) {
      fields.push({ path, description, type: "date", nullable })
    } else if (inner instanceof z.ZodObject) {
      fields.push({ path, description, type: "group", nullable })
      collectFields(inner, path, fields)
    } else if (inner instanceof z.ZodArray) {
      fields.push({ path, description, type: "list", nullable })
    } else if (inner instanceof z.ZodNumber) {
      fields.push({ path, description, type: "number", nullable })
    } else if (inner instanceof z.ZodBoolean) {
      fields.push({ path, description, type: "yes/no", nullable })
    } else {
      fields.push({ path, description, type: "text", nullable })
    }
  }
}

export function listRenderFields(): RenderField[] {
  const fields: RenderField[] = []
  collectFields(contractRenderDataSchema, "data", fields)
  return fields
}
