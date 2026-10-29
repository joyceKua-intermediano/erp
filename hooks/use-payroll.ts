import { keepPreviousData, skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  archivePayroll,
  createPayroll,
  getClusterPayrolls,
  getPayroll,
  getPayrollFormOptions,
  updatePayroll,
} from "@/app/actions/payroll"
import { unwrapActionResult } from "@/lib/action-result"
import type { ClusterId } from "@/lib/clusters"
import type { PayrollFormInput, PayrollListQuery } from "@/lib/payroll"
import { useUiStore } from "@/store/use-ui-store"

export const payrollQueryKeys = {
  cluster: (clusterId: ClusterId | null) => ["cluster", clusterId, "payroll"] as const,
  list: (clusterId: ClusterId | null) => ["cluster", clusterId, "payroll", "list"] as const,
  detail: (clusterId: ClusterId | null, payrollId: string) => ["cluster", clusterId, "payroll", payrollId] as const,
  formOptions: (clusterId: ClusterId | null) => ["cluster", clusterId, "payroll-form-options"] as const,
}

export function usePayrolls(query: PayrollListQuery) {
  const activeCluster = useUiStore((state) => state.activeCluster)

  return useQuery({
    queryKey: [...payrollQueryKeys.list(activeCluster), query] as const,
    queryFn: activeCluster ? () => getClusterPayrolls(activeCluster, query) : skipToken,
    placeholderData: keepPreviousData,
  })
}

export function usePayroll(payrollId: string) {
  const activeCluster = useUiStore((state) => state.activeCluster)

  return useQuery({
    queryKey: payrollQueryKeys.detail(activeCluster, payrollId),
    queryFn: activeCluster ? () => getPayroll(activeCluster, payrollId) : skipToken,
  })
}

export function usePayrollFormOptions() {
  const activeCluster = useUiStore((state) => state.activeCluster)

  return useQuery({
    queryKey: payrollQueryKeys.formOptions(activeCluster),
    queryFn: activeCluster ? () => getPayrollFormOptions(activeCluster) : skipToken,
    staleTime: 5 * 60 * 1000,
  })
}

// One run's provisions feed the ledger of the consultant's later runs, so every payroll query is refreshed.
function useInvalidatePayrolls() {
  const queryClient = useQueryClient()
  return (clusterId: ClusterId, skipPayrollId?: string) => {
    const skippedKey = skipPayrollId ? payrollQueryKeys.detail(clusterId, skipPayrollId).join("/") : null
    return queryClient.invalidateQueries({
      queryKey: payrollQueryKeys.cluster(clusterId),
      predicate: (query) => query.queryKey.join("/") !== skippedKey,
    })
  }
}

function requireActiveCluster(clusterId: ClusterId | null): ClusterId {
  if (!clusterId) throw new Error("Choose a cluster first.")
  return clusterId
}

export function useSavePayroll() {
  const activeCluster = useUiStore((state) => state.activeCluster)
  const invalidate = useInvalidatePayrolls()

  return useMutation({
    mutationFn: async ({ payrollId, input }: { payrollId: string | null; input: PayrollFormInput }) => {
      const clusterId = requireActiveCluster(activeCluster)
      const data = unwrapActionResult(
        payrollId ? await updatePayroll(clusterId, payrollId, input) : await createPayroll(clusterId, input)
      )
      return { ...data, clusterId }
    },
    onSuccess: ({ clusterId }) => invalidate(clusterId),
  })
}

export function useArchivePayroll() {
  const activeCluster = useUiStore((state) => state.activeCluster)
  const invalidate = useInvalidatePayrolls()

  return useMutation({
    mutationFn: async (payrollId: string) => {
      const clusterId = requireActiveCluster(activeCluster)
      return { ...unwrapActionResult(await archivePayroll(clusterId, payrollId)), clusterId }
    },
    // Refetching the archived payroll's own detail would flash "not found" before the page navigates away.
    onSuccess: ({ id, clusterId }) => invalidate(clusterId, id),
  })
}
