import { z } from "zod"
import { contractKinds, type ContractKind } from "./contracts"

export type ContractTemplate = {
  id: string
  name: string
  clusterId: string | null
  clusterName: string | null
  countryName: string | null
  contractKind: ContractKind | null
  hasTypstSource: boolean
  hasLegacyContent: boolean
  contractCount: number
  updatedAt: string | null
}

export type ContractTemplateDetail = ContractTemplate & {
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

export const templateFormSchema = z.object({
  name: z.string().trim().min(1, "Give the template a name.").max(255, "Name is too long."),
  clusterId: z.union([z.literal(""), z.string().regex(/^\d+$/, "Choose a cluster.")]),
  contractKind: z.union([z.literal(""), z.enum(contractKinds)]),
  typstSource: z
    .string()
    .max(MAX_SOURCE_LENGTH, "The template is too long.")
    .refine((value) => value.trim().length > 0, { message: "Write the template before saving." }),
})

export type TemplateFormInput = z.input<typeof templateFormSchema>

export const templatePreviewSchema = z.object({
  source: z.string().max(MAX_SOURCE_LENGTH, "The template is too long."),
  contractId: z.string().regex(/^\d+$/, "Choose a sample contract."),
  clusterId: z.string().regex(/^\d+$/, "Choose a sample contract."),
})

export const STARTER_TEMPLATE = `#import "/lib/layout.typ": contract
#import "/lib/format.typ": field, date, paragraphs, bilingual, facts
#import "/lib/signatures.typ": signature-row

#let data = json(bytes(sys.inputs.data))
#let c = data.contract
#let e = data.employee

#show: contract.with(data.cluster, title: "Contrato " + c.number)

= Contrato individual de trabajo

Entre *#data.cluster.legalName* y *#e.name*, identificado(a) con #field(e.personalId), se celebra el presente contrato.

== Primera. – Objeto
#e.name prestará sus servicios como #field(c.jobTitle) a partir del #date(c.startDate).

== Segunda. – Salario
El salario mensual es de #field(data.salary.formatted) (#field(data.salary.spelledLocal)).

== Tercera. – Funciones
#paragraphs(c.jobDescription, placeholder: [Según la descripción del cargo.])

#signature-row(data)
`

export function toTemplateFormInput(template: ContractTemplateDetail | null): TemplateFormInput {
  return {
    name: template?.name ?? "",
    clusterId: template?.clusterId ?? "",
    contractKind: template?.contractKind ?? "employee",
    typstSource: template ? template.typstSource : STARTER_TEMPLATE,
  }
}
