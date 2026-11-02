import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createMyExpenseClaim,
  deleteMyExpenseClaim,
  getMyExpenseClaim,
  getMyExpenseClaims,
  updateMyExpenseClaim,
} from "@/app/actions/employee-expenses"
import { unwrapActionResult } from "@/lib/action-result"
import type { ExpenseClaimFormInput } from "@/lib/expenses"

export const employeeExpenseQueryKeys = {
  all: ["employee", "expenses"] as const,
  list: ["employee", "expenses", "list"] as const,
  detail: (expenseId: string) => ["employee", "expenses", expenseId] as const,
}

export function useMyExpenseClaims() {
  return useQuery({
    queryKey: employeeExpenseQueryKeys.list,
    queryFn: () => getMyExpenseClaims(),
  })
}

export function useMyExpenseClaim(expenseId: string) {
  return useQuery({
    queryKey: employeeExpenseQueryKeys.detail(expenseId),
    queryFn: () => getMyExpenseClaim(expenseId),
  })
}

export function useSaveMyExpenseClaim() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ expenseId, input }: { expenseId: string | null; input: ExpenseClaimFormInput }) =>
      unwrapActionResult(expenseId ? await updateMyExpenseClaim(expenseId, input) : await createMyExpenseClaim(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeExpenseQueryKeys.all }),
  })
}

export function useDeleteMyExpenseClaim() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (expenseId: string) => unwrapActionResult(await deleteMyExpenseClaim(expenseId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeExpenseQueryKeys.all }),
  })
}

// Receipts go to a route handler, since Server Action bodies are capped at 1 MB.
export async function uploadExpenseReceipt(file: File): Promise<string> {
  const body = new FormData()
  body.append("file", file)

  let response: Response
  try {
    response = await fetch("/api/employee/expense-receipts", { method: "POST", body })
  } catch {
    throw new Error("Could not upload this receipt. Check your connection and try again.")
  }

  const result: unknown = await response.json().catch(() => null)
  const payload = result && typeof result === "object" ? (result as { path?: unknown; error?: unknown }) : {}
  if (!response.ok || typeof payload.path !== "string") {
    throw new Error(typeof payload.error === "string" ? payload.error : "Could not upload this receipt. Try again.")
  }
  return payload.path
}

export function useUploadExpenseReceipt() {
  return useMutation({ mutationFn: uploadExpenseReceipt })
}
