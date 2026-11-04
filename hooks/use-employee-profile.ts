import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getMyContracts, getMyDocuments, getMyProfile, saveMyDocuments, saveMyProfile } from "@/app/actions/employee-profile"
import { unwrapActionResult } from "@/lib/action-result"
import type { DocumentsFormInput, ProfileFormInput } from "@/lib/employee-profile"

export const employeeProfileQueryKeys = {
  profile: ["employee", "profile"] as const,
  documents: ["employee", "documents"] as const,
  contracts: ["employee", "contracts"] as const,
}

export function myContractPdfUrl(contractId: string, download = false) {
  return `/api/employee/contracts/${contractId}/pdf${download ? "?download=1" : ""}`
}

export function useMyProfile() {
  return useQuery({
    queryKey: employeeProfileQueryKeys.profile,
    queryFn: () => getMyProfile(),
  })
}

export function useSaveMyProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ProfileFormInput) => unwrapActionResult(await saveMyProfile(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeProfileQueryKeys.profile }),
  })
}

export function useMyDocuments() {
  return useQuery({
    queryKey: employeeProfileQueryKeys.documents,
    queryFn: () => getMyDocuments(),
  })
}

export function useSaveMyDocuments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: DocumentsFormInput) => unwrapActionResult(await saveMyDocuments(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeProfileQueryKeys.documents }),
  })
}

export function useMyContracts() {
  return useQuery({
    queryKey: employeeProfileQueryKeys.contracts,
    queryFn: () => getMyContracts(),
  })
}

// Files go to a route handler, since Server Action bodies are capped at 1 MB.
export async function uploadEmployeeDocument(file: File): Promise<{ path: string; fileName: string }> {
  const body = new FormData()
  body.append("file", file)

  let response: Response
  try {
    response = await fetch("/api/employee/documents", { method: "POST", body })
  } catch {
    throw new Error("Could not upload this file. Check your connection and try again.")
  }

  const result: unknown = await response.json().catch(() => null)
  const payload =
    result && typeof result === "object" ? (result as { path?: unknown; fileName?: unknown; error?: unknown }) : {}
  if (!response.ok || typeof payload.path !== "string") {
    throw new Error(typeof payload.error === "string" ? payload.error : "Could not upload this file. Try again.")
  }
  return { path: payload.path, fileName: typeof payload.fileName === "string" ? payload.fileName : file.name }
}
