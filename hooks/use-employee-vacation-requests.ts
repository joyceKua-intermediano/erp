import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createMyVacationRequest,
  deleteMyVacationRequest,
  getMyVacationRequest,
  getMyVacationRequests,
  updateMyVacationRequest,
} from "@/app/actions/employee-vacation-requests"
import { unwrapActionResult } from "@/lib/action-result"
import type { VacationFormInput } from "@/lib/vacations"

export const employeeVacationQueryKeys = {
  all: ["employee", "vacations"] as const,
  list: ["employee", "vacations", "list"] as const,
  detail: (requestId: string) => ["employee", "vacations", requestId] as const,
}

export function useMyVacationRequests() {
  return useQuery({
    queryKey: employeeVacationQueryKeys.list,
    queryFn: () => getMyVacationRequests(),
  })
}

export function useMyVacationRequest(requestId: string) {
  return useQuery({
    queryKey: employeeVacationQueryKeys.detail(requestId),
    queryFn: () => getMyVacationRequest(requestId),
  })
}

export function useSaveMyVacationRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requestId, input }: { requestId: string | null; input: VacationFormInput }) =>
      unwrapActionResult(
        requestId ? await updateMyVacationRequest(requestId, input) : await createMyVacationRequest(input)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeVacationQueryKeys.all }),
  })
}

export function useDeleteMyVacationRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (requestId: string) => unwrapActionResult(await deleteMyVacationRequest(requestId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeVacationQueryKeys.all }),
  })
}
