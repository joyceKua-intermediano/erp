import { keepPreviousData, skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getClusterVacationRequests, reviewVacationRequest } from "@/app/actions/vacation-requests"
import { unwrapActionResult } from "@/lib/action-result"
import type { ClusterId } from "@/lib/clusters"
import type { VacationListQuery, VacationReviewInput } from "@/lib/vacations"
import { useUiStore } from "@/store/use-ui-store"

export const vacationQueryKeys = {
  cluster: (clusterId: ClusterId | null) => ["cluster", clusterId, "vacations"] as const,
  list: (clusterId: ClusterId | null) => ["cluster", clusterId, "vacations", "list"] as const,
}

export function useVacationRequests(query: VacationListQuery) {
  const activeCluster = useUiStore((state) => state.activeCluster)

  return useQuery({
    queryKey: [...vacationQueryKeys.list(activeCluster), query] as const,
    queryFn: activeCluster ? () => getClusterVacationRequests(activeCluster, query) : skipToken,
    placeholderData: keepPreviousData,
  })
}

export function useReviewVacationRequest() {
  const activeCluster = useUiStore((state) => state.activeCluster)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requestId, input }: { requestId: string; input: VacationReviewInput }) => {
      if (!activeCluster) throw new Error("Choose a cluster first.")
      const data = unwrapActionResult(await reviewVacationRequest(activeCluster, requestId, input))
      return { ...data, clusterId: activeCluster }
    },
    onSuccess: ({ clusterId }) => queryClient.invalidateQueries({ queryKey: vacationQueryKeys.cluster(clusterId) }),
  })
}
