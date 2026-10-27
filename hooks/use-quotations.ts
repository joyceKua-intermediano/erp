import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  archiveQuotation,
  createQuotation,
  getClusterQuotations,
  getQuotation,
  getQuotationFormOptions,
  updateQuotation,
} from "@/app/actions/quotations"
import { unwrapActionResult } from "@/lib/action-result"
import type { ClusterId } from "@/lib/clusters"
import type { QuotationFormInput, QuotationScope } from "@/lib/quotations"
import { useUiStore } from "@/store/use-ui-store"
import { contractQueryKeys } from "./use-contracts"

export const quotationQueryKeys = {
  cluster: (clusterId: ClusterId | null) => ["cluster", clusterId, "quotations"] as const,
  list: (clusterId: ClusterId | null, scope: QuotationScope) =>
    ["cluster", clusterId, "quotations", "list", scope] as const,
  detail: (clusterId: ClusterId | null, quotationId: string) => ["cluster", clusterId, "quotations", quotationId] as const,
  formOptions: (clusterId: ClusterId | null) => ["cluster", clusterId, "quotation-form-options"] as const,
}

export function useQuotations(scope: QuotationScope = "direct") {
  const activeCluster = useUiStore((state) => state.activeCluster)

  return useQuery({
    queryKey: quotationQueryKeys.list(activeCluster, scope),
    queryFn: activeCluster ? () => getClusterQuotations(activeCluster, scope) : skipToken,
  })
}

export function useQuotation(quotationId: string) {
  const activeCluster = useUiStore((state) => state.activeCluster)

  return useQuery({
    queryKey: quotationQueryKeys.detail(activeCluster, quotationId),
    queryFn: activeCluster ? () => getQuotation(activeCluster, quotationId) : skipToken,
  })
}

export function useQuotationFormOptions() {
  const activeCluster = useUiStore((state) => state.activeCluster)

  return useQuery({
    queryKey: quotationQueryKeys.formOptions(activeCluster),
    queryFn: activeCluster ? () => getQuotationFormOptions(activeCluster) : skipToken,
    staleTime: 5 * 60 * 1000,
  })
}

function useInvalidateQuotations() {
  const queryClient = useQueryClient()
  return (clusterId: ClusterId, skipQuotationId?: string) => {
    const skippedKey = skipQuotationId ? quotationQueryKeys.detail(clusterId, skipQuotationId).join("/") : null
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: quotationQueryKeys.cluster(clusterId),
        predicate: (query) => query.queryKey.join("/") !== skippedKey,
      }),
      // Contract details show the linked quotation's title.
      queryClient.invalidateQueries({ queryKey: contractQueryKeys.cluster(clusterId) }),
    ])
  }
}

function requireActiveCluster(clusterId: ClusterId | null): ClusterId {
  if (!clusterId) throw new Error("Choose a cluster first.")
  return clusterId
}

export function useSaveQuotation() {
  const activeCluster = useUiStore((state) => state.activeCluster)
  const invalidate = useInvalidateQuotations()

  return useMutation({
    mutationFn: async ({ quotationId, input }: { quotationId: string | null; input: QuotationFormInput }) => {
      const clusterId = requireActiveCluster(activeCluster)
      const data = unwrapActionResult(
        quotationId ? await updateQuotation(clusterId, quotationId, input) : await createQuotation(clusterId, input)
      )
      return { ...data, clusterId }
    },
    onSuccess: ({ clusterId }) => invalidate(clusterId),
  })
}

export function useArchiveQuotation() {
  const activeCluster = useUiStore((state) => state.activeCluster)
  const invalidate = useInvalidateQuotations()

  return useMutation({
    mutationFn: async (quotationId: string) => {
      const clusterId = requireActiveCluster(activeCluster)
      return { ...unwrapActionResult(await archiveQuotation(clusterId, quotationId)), clusterId }
    },
    // Refetching the archived quotation's own detail would flash "not found" before the page navigates away.
    onSuccess: ({ id, clusterId }) => invalidate(clusterId, id),
  })
}
