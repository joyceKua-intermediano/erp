import { z } from "zod"
import { listRenderFields } from "@/lib/contracts/render-data-schema"

// Admins build templates from these blocks; the server turns them into Typst when a PDF is rendered.
// Stored text keeps fields as {{path}} (e.g. {{employee.name}}) so renaming a label never breaks a template.

export const blockConditions = ["always", "fixed_term", "open_ended", "integral", "ordinary"] as const

export type BlockCondition = (typeof blockConditions)[number]

export const blockConditionLabels: Record<BlockCondition, string> = {
  always: "Always",
  fixed_term: "Only fixed-term contracts",
  open_ended: "Only open-ended contracts",
  integral: "Only integral salary",
  ordinary: "Only ordinary salary",
}

const shortText = z.string().max(1000, "This text is too long.")
const longText = z.string().max(20000, "This text is too long.")

const blockBase = {
  id: z.string().min(1).max(64),
  condition: z.enum(blockConditions),
}

export const detailRowSchema = z.object({
  label: shortText,
  value: shortText,
  labelTranslation: shortText,
  valueTranslation: shortText,
})

export const templateBlockSchema = z.discriminatedUnion("type", [
  z.object({ ...blockBase, type: z.literal("title"), text: shortText, translation: shortText }),
  z.object({
    ...blockBase,
    type: z.literal("clause"),
    heading: shortText,
    text: longText,
    headingTranslation: shortText,
    translation: longText,
  }),
  z.object({ ...blockBase, type: z.literal("details"), rows: z.array(detailRowSchema).max(60) }),
  z.object({ ...blockBase, type: z.literal("jobDescription"), heading: shortText, headingTranslation: shortText }),
  z.object({ ...blockBase, type: z.literal("signatures") }),
  z.object({ ...blockBase, type: z.literal("pageBreak") }),
])

export const templateDocumentSchema = z.object({
  version: z.literal(1),
  bilingual: z.boolean(),
  // Draws each bilingual row as a bordered table row; saved documents from before this option default to off.
  bordered: z.boolean().default(false),
  blocks: z.array(templateBlockSchema).max(300, "A template can have at most 300 blocks."),
})

export type TemplateBlock = z.infer<typeof templateBlockSchema>
export type TemplateBlockType = TemplateBlock["type"]
export type DetailRow = z.infer<typeof detailRowSchema>
export type TemplateDocument = z.infer<typeof templateDocumentSchema>

export const blockTypeLabels: Record<TemplateBlockType, string> = {
  title: "Title",
  clause: "Clause",
  details: "Details table",
  jobDescription: "Job description",
  signatures: "Signatures",
  pageBreak: "Page break",
}

export const blockTypeDescriptions: Record<TemplateBlockType, string> = {
  title: "The contract's main heading.",
  clause: "A clause or paragraph. In two-language templates it's one row: contract language left, English right.",
  details: "Short label and value pairs, like the parties summary. Use Clause blocks for paragraphs.",
  jobDescription: "Prints the job description written on the contract.",
  signatures: "Signature lines for Intermediano and the employee or client.",
  pageBreak: "Starts a new page.",
}

export function newBlockId() {
  return Math.random().toString(36).slice(2, 10)
}

export function emptyDetailRow(): DetailRow {
  return { label: "", value: "", labelTranslation: "", valueTranslation: "" }
}

export function createBlock(type: TemplateBlockType): TemplateBlock {
  const base = { id: newBlockId(), condition: "always" as const }
  switch (type) {
    case "title":
      return { ...base, type, text: "", translation: "" }
    case "clause":
      return { ...base, type, heading: "", text: "", headingTranslation: "", translation: "" }
    case "details":
      return { ...base, type, rows: [emptyDetailRow()] }
    case "jobDescription":
      return { ...base, type, heading: "Funciones", headingTranslation: "Duties" }
    case "signatures":
      return { ...base, type }
    case "pageBreak":
      return { ...base, type }
  }
}

// ---- Fields admins can insert ----

export type InsertableField = {
  token: string
  label: string
  group: string
  description: string
}

const groupLabels: Record<string, string> = {
  contract: "Contract",
  employee: "Employee",
  "employee.bank": "Employee bank",
  "employee.socialSecurity": "Social security",
  client: "Client",
  "client.contact": "Client contact",
  cluster: "Intermediano entity",
  salary: "Salary",
}

const nameOverrides: Record<string, string> = {
  "employee.name": "Full name",
  "employee.printedName": "Full name in capitals",
  "employee.personalId": "ID number",
  "employee.taxId": "Tax ID",
  "client.taxId": "Tax ID",
  "cluster.taxId": "Tax ID",
  "cluster.taxIdLabel": "Tax ID name",
  "salary.formatted": "Amount",
  "salary.amount": "Amount as a number",
  "salary.spelledLocal": "Amount in words",
  "salary.spelledEn": "Amount in words (English)",
  "salary.currencyCode": "Currency code",
  "contract.number": "Contract number",
}

const dateVariants = [
  { key: "long", suffix: "", description: "e.g. 1 de febrero de 2026" },
  { key: "short", suffix: " (dd/mm/yyyy)", description: "e.g. 01/02/2026" },
  { key: "longEn", suffix: " (English)", description: "e.g. February 1, 2026" },
] as const

function humanize(name: string) {
  const words = name.replace(/([A-Z])/g, " $1").trim().toLowerCase()
  const text = words.replace(/\bid\b/g, "ID")
  return text.charAt(0).toUpperCase() + text.slice(1)
}

let cachedFields: InsertableField[] | null = null

export function listInsertableFields(): InsertableField[] {
  if (cachedFields) return cachedFields

  const fields: InsertableField[] = []
  for (const field of listRenderFields()) {
    if (field.type === "group" || field.type === "list" || field.type === "yes/no") continue
    const path = field.path.replace(/^data\./, "")
    const parent = path.slice(0, path.lastIndexOf("."))
    const name = path.slice(path.lastIndexOf(".") + 1)
    const group = groupLabels[parent] ?? humanize(parent)
    const fieldName = nameOverrides[path] ?? humanize(name)

    if (field.type === "date") {
      for (const variant of dateVariants) {
        fields.push({
          token: `${path}.${variant.key}`,
          label: `${group}: ${fieldName}${variant.suffix}`,
          group,
          description: variant.description,
        })
      }
      continue
    }
    fields.push({ token: path, label: `${group}: ${fieldName}`, group, description: field.description })
  }

  cachedFields = fields
  return fields
}

let tokenSet: Set<string> | null = null

export function isKnownToken(token: string) {
  tokenSet ??= new Set(listInsertableFields().map((field) => field.token))
  return tokenSet.has(token)
}

// ---- Conversion between what admins see ({Employee: Full name}) and what's stored ({{employee.name}}) ----

const STORED_TOKEN = /\{\{([\w.]+)\}\}/g
const DISPLAY_TOKEN = /\{([^{}\n]+)\}/g

export function toDisplayText(stored: string) {
  const labels = new Map(listInsertableFields().map((field) => [field.token, field.label]))
  return stored.replace(STORED_TOKEN, (match, token: string) => {
    const label = labels.get(token)
    return label ? `{${label}}` : match
  })
}

export function toStoredText(display: string, unknown?: Set<string>) {
  const tokens = new Map(listInsertableFields().map((field) => [field.label.toLowerCase(), field.token]))
  return display.replace(DISPLAY_TOKEN, (match, label: string, offset: number, whole: string) => {
    if (whole[offset - 1] === "{" || whole[offset + match.length] === "}") return match
    const token = tokens.get(label.trim().toLowerCase())
    if (token) return `{{${token}}}`
    unknown?.add(match)
    return match
  })
}

function mapBlockText(block: TemplateBlock, convert: (text: string) => string): TemplateBlock {
  switch (block.type) {
    case "title":
      return { ...block, text: convert(block.text), translation: convert(block.translation) }
    case "clause":
      return {
        ...block,
        heading: convert(block.heading),
        text: convert(block.text),
        headingTranslation: convert(block.headingTranslation),
        translation: convert(block.translation),
      }
    case "details":
      return {
        ...block,
        rows: block.rows.map((row) => ({
          label: convert(row.label),
          value: convert(row.value),
          labelTranslation: convert(row.labelTranslation),
          valueTranslation: convert(row.valueTranslation),
        })),
      }
    case "jobDescription":
      return { ...block, heading: convert(block.heading), headingTranslation: convert(block.headingTranslation) }
    default:
      return block
  }
}

export function toDisplayDocument(document: TemplateDocument): TemplateDocument {
  return { ...document, blocks: document.blocks.map((block) => mapBlockText(block, toDisplayText)) }
}

export function toStoredDocument(document: TemplateDocument): { document: TemplateDocument; unknownFields: string[] } {
  const unknown = new Set<string>()
  const blocks = document.blocks.map((block) => mapBlockText(block, (text) => toStoredText(text, unknown)))
  return { document: { ...document, blocks }, unknownFields: [...unknown] }
}

export function parseTemplateDocument(json: string | null): TemplateDocument | null {
  if (!json) return null
  try {
    const parsed = templateDocumentSchema.safeParse(JSON.parse(json))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
