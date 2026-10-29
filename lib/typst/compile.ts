import "server-only"
import { fork, type ChildProcess } from "node:child_process"
import path from "node:path"
import type { TypstDiagnostic } from "./diagnostics"

export type { TypstDiagnostic }

// Templates import the shared library as "/lib/*.typ", resolved against this root.
const TYPST_ROOT = path.join(process.cwd(), "typst")
const RENDERER_PATH = path.join(TYPST_ROOT, "renderer.mjs")
const RENDER_TIMEOUT_MS = 20_000
const MAX_WAITING_RENDERS = 20

export class TypstRenderError extends Error {
  readonly diagnostics: TypstDiagnostic[]

  constructor(diagnostics: TypstDiagnostic[]) {
    super(diagnostics[0]?.message ?? "The template couldn't be compiled.")
    this.name = "TypstRenderError"
    this.diagnostics = diagnostics
  }
}

type RenderReply =
  | { id: number; ok: true; pdf: Uint8Array }
  | { id: number; ok: false; diagnostics: TypstDiagnostic[] }
  | { id: number; ok: false; error: string }

function generalDiagnostic(message: string): TypstDiagnostic[] {
  return [{ message, line: null, column: null, inTemplate: true }]
}

// Typst runs in a child process because its compiler is native and synchronous: in-process, a template that loops
// forever would block every request, and only killing a process can stop it. Renders run one at a time.
class TypstRenderer {
  private child: ChildProcess | null = null
  private tail: Promise<unknown> = Promise.resolve()
  private waiting = 0
  private nextId = 1

  render(source: string, data: unknown): Promise<Buffer> {
    if (this.waiting >= MAX_WAITING_RENDERS) {
      return Promise.reject(new TypstRenderError(generalDiagnostic("The PDF renderer is busy. Try again in a moment.")))
    }

    this.waiting++
    const job = this.tail.then(() => this.run(source, JSON.stringify(data))).finally(() => {
      this.waiting--
    })
    this.tail = job.catch(() => undefined)
    return job
  }

  private ensureChild(): ChildProcess {
    if (this.child?.connected) return this.child

    // The renderer is a plain runtime file (traced via outputFileTracingIncludes), not something to bundle.
    const child = fork(/* turbopackIgnore: true */ RENDERER_PATH, [TYPST_ROOT], {
      serialization: "advanced",
      stdio: ["ignore", "inherit", "inherit", "ipc"],
    })
    child.on("error", (error) => console.error("Typst renderer process error", { error }))
    child.on("exit", () => {
      if (this.child === child) this.child = null
    })
    this.child = child
    return child
  }

  private kill(child: ChildProcess) {
    if (this.child === child) this.child = null
    child.kill("SIGKILL")
  }

  private run(source: string, data: string): Promise<Buffer> {
    let child: ChildProcess
    try {
      child = this.ensureChild()
    } catch (error) {
      return Promise.reject(error)
    }
    const id = this.nextId++

    return new Promise<Buffer>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer)
        child.off("message", onMessage)
        child.off("exit", onExit)
      }
      const timer = setTimeout(() => {
        cleanup()
        this.kill(child)
        reject(
          new TypstRenderError(
            generalDiagnostic(
              `The template took longer than ${RENDER_TIMEOUT_MS / 1000} seconds to render. Check it for loops that never end.`
            )
          )
        )
      }, RENDER_TIMEOUT_MS)
      const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
        cleanup()
        reject(new Error(`The Typst renderer stopped unexpectedly (${signal ?? code}).`))
      }
      const onMessage = (reply: RenderReply) => {
        if (reply.id !== id) return
        cleanup()
        if (reply.ok) resolve(Buffer.from(reply.pdf))
        else if ("diagnostics" in reply) reject(new TypstRenderError(reply.diagnostics))
        else reject(new Error(reply.error))
      }

      child.on("message", onMessage)
      child.on("exit", onExit)
      child.send({ id, source, data }, (error) => {
        if (!error) return
        cleanup()
        reject(error)
      })
    })
  }
}

const globalForTypst = globalThis as unknown as { typstRenderer?: TypstRenderer }

export function renderPdf(source: string, data: unknown): Promise<Buffer> {
  globalForTypst.typstRenderer ??= new TypstRenderer()
  return globalForTypst.typstRenderer.render(source, data)
}
