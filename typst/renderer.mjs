// Compiles Typst in its own process, started by lib/typst/compile.ts, so a template that never finishes can be
// killed without freezing the web server. Requests arrive one at a time over IPC.
import path from "node:path"
import typstCompiler from "@myriaddreamin/typst-ts-node-compiler"

// The compiler package is CommonJS, so its exports arrive as the default import.
const { NodeCompiler } = typstCompiler

const root = process.argv[2]
// The template is mapped to a virtual file because diagnostics only carry line ranges for files with a path.
const templatePath = path.join(root, "__template__.typ")

const compiler = NodeCompiler.create({
  workspace: root,
  fontArgs: [{ fontPaths: [path.join(root, "fonts")] }],
})

function normalizePath(value) {
  return value.replace(/\\/g, "/").toLowerCase()
}

function toDiagnostics(error) {
  let raw
  try {
    raw = compiler.fetchDiagnostics(error)
  } catch {
    raw = error.shortDiagnostics
  }

  const template = normalizePath(templatePath)
  const diagnostics = (raw ?? []).map((diagnostic) => {
    const start = diagnostic.range && diagnostic.range.start
    return {
      message: diagnostic.message || "Unknown Typst error.",
      line: start && typeof start.line === "number" ? start.line + 1 : null,
      column: start && typeof start.character === "number" ? start.character + 1 : null,
      inTemplate: diagnostic.path ? normalizePath(diagnostic.path) === template : true,
    }
  })
  return diagnostics.length > 0 ? diagnostics : [{ message: error.kind, line: null, column: null, inTemplate: true }]
}

function render(source, data) {
  compiler.mapShadow(templatePath, Buffer.from(source, "utf8"))
  try {
    const result = compiler.compile({ mainFilePath: templatePath, inputs: { data } })
    const error = result.takeError()
    if (error) return { ok: false, diagnostics: toDiagnostics(error) }
    const document = result.result
    if (!document) {
      return {
        ok: false,
        diagnostics: [{ message: "The template produced no document.", line: null, column: null, inTemplate: true }],
      }
    }
    return { ok: true, pdf: compiler.pdf(document) }
  } finally {
    compiler.unmapShadow(templatePath)
    compiler.evictCache(10)
  }
}

process.on("message", (request) => {
  let reply
  try {
    reply = render(request.source, request.data)
  } catch (error) {
    reply = { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
  process.send({ id: request.id, ...reply })
})

// The web server owns this process; when it goes away, so does the renderer.
process.on("disconnect", () => process.exit(0))
