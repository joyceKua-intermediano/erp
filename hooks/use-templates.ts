import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  archiveTemplate,
  createTemplate,
  getSampleContracts,
  getTemplate,
  getTemplates,
  updateTemplate,
} from "@/app/actions/templates"
import { unwrapActionResult } from "@/lib/action-result"
import type { TypstDiagnostic } from "@/lib/typst/diagnostics"
import type { TemplateFormInput } from "@/lib/templates"

export const templateQueryKeys = {
  all: ["templates"] as const,
  detail: (templateId: string) => ["templates", templateId] as const,
  samples: ["templates", "sample-contracts"] as const,
}

export function useTemplates() {
  return useQuery({
    queryKey: templateQueryKeys.all,
    queryFn: () => getTemplates(),
  })
}

export function useTemplate(templateId: string | null) {
  return useQuery({
    queryKey: templateQueryKeys.detail(templateId ?? "new"),
    queryFn: () => (templateId ? getTemplate(templateId) : null),
    // The editor owns the source while it's open; a background refetch would overwrite unsaved edits.
    refetchOnWindowFocus: false,
  })
}

export function useSampleContracts() {
  return useQuery({
    queryKey: templateQueryKeys.samples,
    queryFn: () => getSampleContracts(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSaveTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ templateId, input }: { templateId: string | null; input: TemplateFormInput }) =>
      unwrapActionResult(templateId ? await updateTemplate(templateId, input) : await createTemplate(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templateQueryKeys.all }),
  })
}

export function useArchiveTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (templateId: string) => unwrapActionResult(await archiveTemplate(templateId)),
    // Refetching the archived template's own detail would flash "not found" before the page navigates away.
    onSuccess: (_result, templateId) => {
      const skippedKey = templateQueryKeys.detail(templateId).join("/")
      return queryClient.invalidateQueries({
        queryKey: templateQueryKeys.all,
        predicate: (query) => query.queryKey.join("/") !== skippedKey,
      })
    },
  })
}

export type TemplatePreview =
  | { status: "ready"; url: string }
  | { status: "error"; message: string; diagnostics: TypstDiagnostic[] }

async function fetchPreview(source: string, contractId: string, clusterId: string): Promise<TemplatePreview> {
  const response = await fetch("/api/templates/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source, contractId, clusterId }),
  })

  if (response.ok) {
    return { status: "ready", url: URL.createObjectURL(await response.blob()) }
  }

  let payload: { error?: string; diagnostics?: TypstDiagnostic[] } = {}
  try {
    payload = await response.json()
  } catch {
    // Non-JSON failures (for example a proxy error page) fall back to the generic message.
  }
  return {
    status: "error",
    message: payload.error ?? "The preview couldn't be rendered.",
    diagnostics: payload.diagnostics ?? [],
  }
}

export function useTemplatePreview(source: string, sample: { contractId: string; clusterId: string } | null) {
  return useQuery({
    queryKey: ["templates", "preview", sample?.contractId ?? null, source] as const,
    queryFn: () => (sample ? fetchPreview(source, sample.contractId, sample.clusterId) : null),
    enabled: sample !== null && source.trim().length > 0,
    placeholderData: (previous) => previous,
    staleTime: Infinity,
    // Each result owns an object URL that the editor revokes once replaced, so stale entries can't be reused.
    gcTime: 0,
    refetchOnWindowFocus: false,
  })
}
