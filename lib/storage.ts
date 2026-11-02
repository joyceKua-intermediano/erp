import "server-only"
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { env } from "./env"

// Private files kept on the server disk under STORAGE_DIR, never under public/; they are only
// served through route handlers that check who is asking.

const storageRoot = path.resolve(process.cwd(), env.STORAGE_DIR)

// Stored paths are relative ("expense-receipts/12/<uuid>.jpg"); anything resolving outside the root is refused.
export function resolveStoragePath(relativePath: string): string | null {
  if (!relativePath || relativePath.includes("\0") || path.isAbsolute(relativePath)) return null
  const resolved = path.resolve(storageRoot, relativePath)
  return resolved.startsWith(storageRoot + path.sep) ? resolved : null
}

export async function saveStoredFile(relativePath: string, bytes: Uint8Array) {
  const target = resolveStoragePath(relativePath)
  if (!target) throw new Error("Invalid storage path.")
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, bytes, { flag: "wx" })
}

// Null when the file isn't there, e.g. a legacy receipt that hasn't been copied over.
export async function readStoredFile(relativePath: string): Promise<Buffer | null> {
  const target = resolveStoragePath(relativePath)
  if (!target) return null
  try {
    return await readFile(target)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
    throw error
  }
}

export async function storedFileExists(relativePath: string) {
  const target = resolveStoragePath(relativePath)
  if (!target) return false
  try {
    return (await stat(target)).isFile()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false
    throw error
  }
}

export async function deleteStoredFile(relativePath: string) {
  const target = resolveStoragePath(relativePath)
  if (!target) return
  try {
    await unlink(target)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
}
