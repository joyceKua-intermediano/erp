import { z } from "zod"

// Cluster lists are fetched a page at a time, with their search and filters applied on the server.

export const PAGE_SIZE = 25
export const SEARCH_DEBOUNCE_MS = 300

export const pageNumberSchema = z.number().int().min(1).max(1_000_000).catch(1)

export const listSearchSchema = z.string().trim().max(100).catch("")

export function pageArgs(page: number) {
  return { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }
}

export function pageCount(total: number) {
  return Math.max(1, Math.ceil(total / PAGE_SIZE))
}
