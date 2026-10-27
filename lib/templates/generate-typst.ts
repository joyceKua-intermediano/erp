import { isKnownToken, type BlockCondition, type DetailRow, type TemplateBlock, type TemplateDocument } from "./blocks"

const HEADER = `#import "/lib/layout.typ": contract
#import "/lib/format.typ": field, lookup, paragraphs, bilingual, facts
#import "/lib/signatures.typ": signature-row

#let data = json(bytes(sys.inputs.data))
#show: contract.with(data.cluster, title: data.contract.number)
`

const conditionExpressions: Record<Exclude<BlockCondition, "always">, string> = {
  fixed_term: "not data.contract.isOpenEnded",
  open_ended: "data.contract.isOpenEnded",
  integral: "data.contract.isIntegral",
  ordinary: "not data.contract.isIntegral",
}

const TOKEN = /\{\{([\w.]+)\}\}/g

// Admin text is emitted as Typst string literals, so markup characters (#, *, _, //, …) always print as typed.
function literal(text: string) {
  if (!text) return ""
  const escaped = text
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\t/g, " ")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
  return `#"${escaped}"`
}

// One line of text with {{tokens}}; unknown tokens print literally so a typo shows up in the preview.
// Fields go through `lookup` because dates and the client can be none, and reading a field of none fails the compile.
function inline(text: string) {
  let output = ""
  let last = 0
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0
    output += literal(text.slice(last, index))
    output += isKnownToken(match[1]) ? `#field(lookup(data, "${match[1]}"))` : literal(match[0])
    last = index + match[0].length
  }
  return output + literal(text.slice(last))
}

function paragraphs(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => paragraph.split("\n").map(inline).join("#linebreak()"))
}

function clauseSide(heading: string, text: string) {
  const parts = paragraphs(text)
  const lead = heading.trim() ? `#strong[${inline(heading.trim())}]` : ""
  if (parts.length === 0) return lead
  const [first, ...rest] = parts
  return [lead ? `${lead}#" "${first}` : first, ...rest].join("\n\n")
}

function factsTable(rows: { label: string; value: string }[]) {
  const cells = rows.map((row) => `([${inline(row.label)}], [${inline(row.value)}])`)
  return `facts((${cells.join(", ")},))`
}

function detailsBlock(rows: DetailRow[], bilingual: boolean) {
  const filled = rows.filter((row) => row.label.trim() || row.value.trim())
  if (filled.length === 0) return ""
  const primary = factsTable(filled)
  if (!bilingual) return `#${primary}`
  const translated = factsTable(
    filled.map((row) => ({
      label: row.labelTranslation.trim() ? row.labelTranslation : row.label,
      value: row.valueTranslation.trim() ? row.valueTranslation : row.value,
    }))
  )
  return `#bilingual(${primary}, ${translated})`
}

type Layout = { bilingual: boolean; bordered: boolean }

function blockBody(block: TemplateBlock, { bilingual, bordered }: Layout): string {
  const columns = (left: string, right: string) =>
    `#bilingual([\n${left}\n], [\n${right}\n]${bordered ? ", bordered: true" : ""})`

  switch (block.type) {
    case "title": {
      const title = `#heading(level: 1)[${inline(block.text.replace(/\n/g, " "))}]`
      if (!bilingual || !block.translation.trim()) return title
      return `${title}\n#align(center, text(9pt, fill: luma(90))[${inline(block.translation.replace(/\n/g, " "))}])`
    }
    case "clause": {
      const primary = clauseSide(block.heading, block.text)
      if (!bilingual) return primary
      return columns(primary, clauseSide(block.headingTranslation, block.translation))
    }
    case "details":
      return detailsBlock(block.rows, bilingual)
    case "jobDescription": {
      const side = (heading: string, field: string) =>
        `${heading.trim() ? `#strong[${inline(heading.trim())}]\n\n` : ""}#paragraphs(data.contract.${field}, placeholder: [—])`
      const primary = side(block.heading, "jobDescription")
      if (!bilingual) return primary
      return columns(primary, side(block.headingTranslation, "translatedJobDescription"))
    }
    case "signatures":
      return "#signature-row(data)"
    case "pageBreak":
      return "#pagebreak(weak: true)"
  }
}

export function generateTypst(document: TemplateDocument) {
  const blocks = document.blocks
    .map((block) => {
      const body = blockBody(block, { bilingual: document.bilingual, bordered: document.bilingual && document.bordered })
      if (!body) return ""
      if (block.condition === "always") return body
      return `#if ${conditionExpressions[block.condition]} [\n${body}\n]`
    })
    .filter(Boolean)

  return `${HEADER}\n${blocks.join("\n\n")}\n`
}
