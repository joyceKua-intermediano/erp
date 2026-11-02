import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  approveCustomerExpenseClaim,
  getCustomerExpenseClaim,
  getCustomerExpenseClaims,
  reviewCustomerExpenseItem,
} from "@/app/actions/customer-expenses"
import { unwrapActionResult } from "@/lib/action-result"
import type { ExpenseListQuery, ExpenseReviewInput } from "@/lib/expenses"
import { customerDashboardQueryKeys } from "./use-customer-dashboard"

export const customerExpenseQueryKeys = {
  all: ["customer", "expenses"] as const,
  list: ["customer", "expenses", "list"] as const,
  detail: (expenseId: string) => ["customer", "expenses", expenseId] as const,
}

export function useCustomerExpenseClaims(query: ExpenseListQuery) {
  return useQuery({
    queryKey: [...customerExpenseQueryKeys.list, query] as const,
    queryFn: () => getCustomerExpenseClaims(query),
    placeholderData: keepPreviousData,
  })
}

export function useCustomerExpenseClaim(expenseId: string) {
  return useQuery({
    queryKey: customerExpenseQueryKeys.detail(expenseId),
    queryFn: () => getCustomerExpenseClaim(expenseId),
  })
}

function useInvalidateCustomerExpenses() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: customerExpenseQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: customerDashboardQueryKeys.all }),
    ])
}

export function useReviewCustomerExpenseItem() {
  const invalidate = useInvalidateCustomerExpenses()

  return useMutation({
    mutationFn: async ({ expenseId, input }: { expenseId: string; input: ExpenseReviewInput }) =>
      unwrapActionResult(await reviewCustomerExpenseItem(expenseId, input)),
    onSuccess: invalidate,
  })
}

export function useApproveCustomerExpenseClaim() {
  const invalidate = useInvalidateCustomerExpenses()

  return useMutation({
    mutationFn: async ({ expenseId, version }: { expenseId: string; version: string }) =>
      unwrapActionResult(await approveCustomerExpenseClaim(expenseId, version)),
    onSuccess: invalidate,
  })
}
