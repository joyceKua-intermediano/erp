import "server-only"
import { prisma } from "@/lib/prisma"
import { renderPdf, TypstRenderError, type TypstDiagnostic } from "@/lib/typst/compile"
import { buildContractRenderData } from "./render-data"

export type ContractPdfResult =
  | { ok: true; pdf: Buffer; fileName: string }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "no_template" }
  | { ok: false; reason: "template_error"; diagnostics: TypstDiagnostic[] }

function toFileName(employeeName: string, startIso: string | null) {
  const prefix = startIso ? `${startIso.slice(8, 10)}.${startIso.slice(5, 7)}.${startIso.slice(2, 4)}` : "draft"
  return `${prefix}_Contrato Individual de ${employeeName}.pdf`
}

// `source` overrides the contract's saved template, for previews in the template editor.
export async function renderContractPdf(
  contractId: bigint,
  clusterId: bigint,
  source?: string
): Promise<ContractPdfResult> {
  const data = await buildContractRenderData(contractId, clusterId)
  if (!data) return { ok: false, reason: "not_found" }

  let templateSource = source
  if (templateSource === undefined) {
    const contract = await prisma.contracts.findFirst({
      where: { id: contractId, intermediano_company_id: clusterId, deleted_at: null },
      select: { templates: { select: { typst_source: true } } },
    })
    templateSource = contract?.templates?.typst_source ?? undefined
  }
  if (!templateSource?.trim()) return { ok: false, reason: "no_template" }

  try {
    return { ok: true, pdf: renderPdf(templateSource, data), fileName: toFileName(data.employee.name, data.contract.startDate?.iso ?? null) }
  } catch (error) {
    if (error instanceof TypstRenderError) return { ok: false, reason: "template_error", diagnostics: error.diagnostics }
    throw error
  }
}

function asciiFallback(fileName: string) {
  return fileName.normalize("NFD").replace(/[^\x20-\x7e]/g, "").replace(/["\\]/g, "")
}

export function pdfResponse(pdf: Buffer, fileName: string, disposition: "inline" | "attachment") {
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${asciiFallback(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  })
}

export function authErrorStatus(error: unknown) {
  return error instanceof Error && error.message === "Unauthorized" ? 401 : 403
}
