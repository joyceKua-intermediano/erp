import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getCustomerVacationRequests, reviewCustomerVacationRequest } from "@/app/actions/customer-vacations"
import { unwrapActionResult } from "@/lib/action-result"
import type { VacationListQuery, VacationReviewInput } from "@/lib/vacations"
import { customerDashboardQueryKeys } from "./use-customer-dashboard"

export const customerVacationQueryKeys = {
  all: ["customer", "vacations"] as const,
  list: ["customer", "vacations", "list"] as const,
}

export function useCustomerVacationRequests(query: VacationListQuery) {
  return useQuery({
    queryKey: [...customerVacationQueryKeys.list, query] as const,
    queryFn: () => getCustomerVacationRequests(query),
    placeholderData: keepPreviousData,
  })
}

export function useReviewCustomerVacationRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requestId, input }: { requestId: string; input: VacationReviewInput }) =>
      unwrapActionResult(await reviewCustomerVacationRequest(requestId, input)),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: customerVacationQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: customerDashboardQueryKeys.all }),
      ]),
  })
}
