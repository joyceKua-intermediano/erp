import { z } from "zod"
import { contractKinds, type ContractKind } from "./contracts"
import { createBlock, templateDocumentSchema, type TemplateDocument } from "./templates/blocks"

// "blocks": built in the block editor; "code": raw Typst for developers; "legacy": only old Tiptap content.
export const templateFormats = ["blocks", "code", "legacy", "empty"] as const

export type TemplateFormat = (typeof templateFormats)[number]

export type ContractTemplate = {
  id: string
  name: string
  clusterId: string | null
  clusterName: string | null
  countryName: string | null
  contractKind: ContractKind | null
  format: TemplateFormat
  contractCount: number
  updatedAt: string | null
}

export type ContractTemplateDetail = ContractTemplate & {
  document: TemplateDocument | null
  typstSource: string
}

export type SampleContractOption = {
  id: string
  clusterId: string
  label: string
}

export const templateIdSchema = z.string().regex(/^\d+$/, "Invalid template id.")

// One megabyte of markup is far beyond any real contract and keeps a runaway paste out of the database.
const MAX_SOURCE_LENGTH = 1_000_000

const typstSourceSchema = z
  .string()
  .max(MAX_SOURCE_LENGTH, "The template is too long.")
  .refine((value) => value.trim().length > 0, { message: "Write the template before saving." })

const blocksDocumentSchema = templateDocumentSchema.refine((document) => document.blocks.length > 0, {
  message: "Add at least one block before saving.",
})

const templateMetaSchema = z.object({
  name: z.string().trim().min(1, "Give the template a name.").max(255, "Name is too long."),
  clusterId: z.union([z.literal(""), z.string().regex(/^\d+$/, "Choose a cluster.")]),
  contractKind: z.union([z.literal(""), z.enum(contractKinds)]),
})

export const templateFormSchema = z.discriminatedUnion("mode", [
  templateMetaSchema.extend({ mode: z.literal("blocks"), document: blocksDocumentSchema }),
  templateMetaSchema.extend({ mode: z.literal("code"), typstSource: typstSourceSchema }),
])

export type TemplateFormInput = z.input<typeof templateFormSchema>
export type TemplateMetaInput = z.input<typeof templateMetaSchema>

const sampleSchema = {
  contractId: z.string().regex(/^\d+$/, "Choose a sample contract."),
  clusterId: z.string().regex(/^\d+$/, "Choose a sample contract."),
  // The saved template being viewed; people who can't edit templates preview its saved code, not what they send.
  templateId: z.string().regex(/^\d+$/, "Invalid template id.").optional(),
}

export const templatePreviewSchema = z.discriminatedUnion("mode", [
  z.object({ ...sampleSchema, mode: z.literal("blocks"), document: templateDocumentSchema }),
  z.object({ ...sampleSchema, mode: z.literal("code"), source: z.string().max(MAX_SOURCE_LENGTH) }),
])

export type TemplatePreviewContent =
  | { mode: "blocks"; document: TemplateDocument }
  | { mode: "code"; source: string }

export function starterDocument(): TemplateDocument {
  const title = createBlock("title")
  const parties = createBlock("clause")
  const start = createBlock("clause")
  const salary = createBlock("clause")
  if (title.type === "title") title.text = "Contrato individual de trabajo"
  if (parties.type === "clause") {
    parties.text =
      "Entre {{cluster.legalName}} y {{employee.name}}, identificado(a) con {{employee.personalId}}, se celebra el presente contrato."
  }
  if (start.type === "clause") {
    start.heading = "PRIMERA. – OBJETO."
    start.text = "{{employee.name}} prestará sus servicios como {{contract.jobTitle}} a partir del {{contract.startDate.long}}."
  }
  if (salary.type === "clause") {
    salary.heading = "SEGUNDA. – SALARIO."
    salary.text = "El salario mensual es de {{salary.formatted}} ({{salary.spelledLocal}})."
  }
  return {
    version: 1,
    bilingual: false,
    bordered: false,
    blocks: [title, parties, start, salary, createBlock("jobDescription"), createBlock("signatures")],
  }
}

export function toTemplateMetaInput(template: ContractTemplateDetail | null): TemplateMetaInput {
  return {
    name: template?.name ?? "",
    clusterId: template?.clusterId ?? "",
    contractKind: template?.contractKind ?? "employee",
  }
}
