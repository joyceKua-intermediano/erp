import "server-only"
import path from "node:path"
import { NodeCompiler, type NodeError } from "@myriaddreamin/typst-ts-node-compiler"
import type { TypstDiagnostic } from "./diagnostics"

export type { TypstDiagnostic }

// Templates import the shared library as "/lib/*.typ", resolved against this root.
const TYPST_ROOT = path.join(process.cwd(), "typst")
// The template is mapped to a virtual file because diagnostics only carry line ranges for files with a path.
const TEMPLATE_PATH = path.join(TYPST_ROOT, "__template__.typ")

export class TypstRenderError extends Error {
  readonly diagnostics: TypstDiagnostic[]

  constructor(diagnostics: TypstDiagnostic[]) {
    super(diagnostics[0]?.message ?? "The template couldn't be compiled.")
    this.name = "TypstRenderError"
    this.diagnostics = diagnostics
  }
}

type RawDiagnostic = {
  message?: string
  path?: string
  severity?: number
  range?: { start?: { line?: number; character?: number } } | null
}

const globalForTypst = globalThis as unknown as { typstCompiler?: NodeCompiler }

function getCompiler() {
  globalForTypst.typstCompiler ??= NodeCompiler.create({
    workspace: TYPST_ROOT,
    fontArgs: [{ fontPaths: [path.join(TYPST_ROOT, "fonts")] }],
  })
  return globalForTypst.typstCompiler
}

function normalizePath(value: string) {
  return value.replace(/\\/g, "/").toLowerCase()
}

function toDiagnostics(compiler: NodeCompiler, error: NodeError): TypstDiagnostic[] {
  let raw: RawDiagnostic[]
  try {
    raw = compiler.fetchDiagnostics(error) as RawDiagnostic[]
  } catch {
    raw = error.shortDiagnostics as RawDiagnostic[]
  }

  const templatePath = normalizePath(TEMPLATE_PATH)
  const diagnostics = raw.map((diagnostic) => {
    const start = diagnostic.range?.start
    return {
      message: diagnostic.message ?? "Unknown Typst error.",
      line: typeof start?.line === "number" ? start.line + 1 : null,
      column: typeof start?.character === "number" ? start.character + 1 : null,
      inTemplate: diagnostic.path ? normalizePath(diagnostic.path) === templatePath : true,
    }
  })
  return diagnostics.length > 0 ? diagnostics : [{ message: error.kind, line: null, column: null, inTemplate: true }]
}

// The native compiler is synchronous, so a compile can't interleave with another request's shadow template.
export function renderPdf(source: string, data: unknown): Buffer {
  const compiler = getCompiler()
  compiler.mapShadow(TEMPLATE_PATH, Buffer.from(source, "utf8"))

  try {
    const result = compiler.compile({ mainFilePath: TEMPLATE_PATH, inputs: { data: JSON.stringify(data) } })
    const error = result.takeError()
    if (error) throw new TypstRenderError(toDiagnostics(compiler, error))
    const document = result.result
    if (!document) throw new TypstRenderError([{ message: "The template produced no document.", line: null, column: null, inTemplate: true }])
    return compiler.pdf(document)
  } finally {
    compiler.unmapShadow(TEMPLATE_PATH)
    compiler.evictCache(10)
  }
}
