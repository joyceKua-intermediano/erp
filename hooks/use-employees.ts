import { skipToken, useQuery } from "@tanstack/react-query"
import { getClusterEmployees } from "@/app/actions/employees"
import type { ClusterId } from "@/lib/clusters"
import { useUiStore } from "@/store/use-ui-store"

export const employeeQueryKeys = {
  cluster: (clusterId: ClusterId | null) => ["cluster", clusterId, "employees"] as const,
}

export function useEmployees() {
  const activeCluster = useUiStore((state) => state.activeCluster)

  return useQuery({
    queryKey: employeeQueryKeys.cluster(activeCluster),
    queryFn: activeCluster ? () => getClusterEmployees(activeCluster) : skipToken,
  })
}
