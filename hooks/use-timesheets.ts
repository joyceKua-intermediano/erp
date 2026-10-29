import { keepPreviousData, skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getClusterTimesheets, getTimesheet, reviewTimesheet } from "@/app/actions/timesheets"
import { unwrapActionResult } from "@/lib/action-result"
import type { ClusterId } from "@/lib/clusters"
import type { TimesheetListQuery, TimesheetReviewInput } from "@/lib/timesheets"
import { useUiStore } from "@/store/use-ui-store"

export const timesheetQueryKeys = {
  cluster: (clusterId: ClusterId | null) => ["cluster", clusterId, "timesheets"] as const,
  list: (clusterId: ClusterId | null) => ["cluster", clusterId, "timesheets", "list"] as const,
  detail: (clusterId: ClusterId | null, timesheetId: string) =>
    ["cluster", clusterId, "timesheets", timesheetId] as const,
}

export function useTimesheets(query: TimesheetListQuery) {
  const activeCluster = useUiStore((state) => state.activeCluster)

  return useQuery({
    queryKey: [...timesheetQueryKeys.list(activeCluster), query] as const,
    queryFn: activeCluster ? () => getClusterTimesheets(activeCluster, query) : skipToken,
    placeholderData: keepPreviousData,
  })
}

export function useTimesheet(timesheetId: string) {
  const activeCluster = useUiStore((state) => state.activeCluster)

  return useQuery({
    queryKey: timesheetQueryKeys.detail(activeCluster, timesheetId),
    queryFn: activeCluster ? () => getTimesheet(activeCluster, timesheetId) : skipToken,
  })
}

export function useReviewTimesheet() {
  const activeCluster = useUiStore((state) => state.activeCluster)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ timesheetId, input }: { timesheetId: string; input: TimesheetReviewInput }) => {
      if (!activeCluster) throw new Error("Choose a cluster first.")
      const data = unwrapActionResult(await reviewTimesheet(activeCluster, timesheetId, input))
      return { ...data, clusterId: activeCluster }
    },
    onSuccess: ({ clusterId }) => queryClient.invalidateQueries({ queryKey: timesheetQueryKeys.cluster(clusterId) }),
  })
}
