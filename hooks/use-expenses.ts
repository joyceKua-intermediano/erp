import { keepPreviousData, skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getClusterExpenseClaim, getClusterExpenseClaims, reviewExpenseItem } from "@/app/actions/expenses"
import { unwrapActionResult } from "@/lib/action-result"
import type { ClusterId } from "@/lib/clusters"
import type { ExpenseListQuery, ExpenseReviewInput } from "@/lib/expenses"
import { useUiStore } from "@/store/use-ui-store"

export const expenseQueryKeys = {
  cluster: (clusterId: ClusterId | null) => ["cluster", clusterId, "expenses"] as const,
  list: (clusterId: ClusterId | null) => ["cluster", clusterId, "expenses", "list"] as const,
  detail: (clusterId: ClusterId | null, expenseId: string) => ["cluster", clusterId, "expenses", expenseId] as const,
}

export function useExpenseClaims(query: ExpenseListQuery) {
  const activeCluster = useUiStore((state) => state.activeCluster)

  return useQuery({
    queryKey: [...expenseQueryKeys.list(activeCluster), query] as const,
    queryFn: activeCluster ? () => getClusterExpenseClaims(activeCluster, query) : skipToken,
    placeholderData: keepPreviousData,
  })
}

export function useExpenseClaim(expenseId: string) {
  const activeCluster = useUiStore((state) => state.activeCluster)

  return useQuery({
    queryKey: expenseQueryKeys.detail(activeCluster, expenseId),
    queryFn: activeCluster ? () => getClusterExpenseClaim(activeCluster, expenseId) : skipToken,
  })
}

export function useReviewExpenseItem() {
  const activeCluster = useUiStore((state) => state.activeCluster)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ expenseId, input }: { expenseId: string; input: ExpenseReviewInput }) => {
      if (!activeCluster) throw new Error("Choose a cluster first.")
      const data = unwrapActionResult(await reviewExpenseItem(activeCluster, expenseId, input))
      return { ...data, clusterId: activeCluster }
    },
    onSuccess: ({ clusterId }) => queryClient.invalidateQueries({ queryKey: expenseQueryKeys.cluster(clusterId) }),
  })
}
