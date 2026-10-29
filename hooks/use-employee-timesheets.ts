import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createMyTimesheet,
  getMyTimesheet,
  getMyTimesheets,
  updateMyTimesheet,
} from "@/app/actions/employee-timesheets"
import { unwrapActionResult } from "@/lib/action-result"
import type { TimesheetFormInput } from "@/lib/timesheets"

export const employeeTimesheetQueryKeys = {
  all: ["employee", "timesheets"] as const,
  list: ["employee", "timesheets", "list"] as const,
  detail: (timesheetId: string) => ["employee", "timesheets", timesheetId] as const,
}

export function useMyTimesheets() {
  return useQuery({
    queryKey: employeeTimesheetQueryKeys.list,
    queryFn: () => getMyTimesheets(),
  })
}

export function useMyTimesheet(timesheetId: string) {
  return useQuery({
    queryKey: employeeTimesheetQueryKeys.detail(timesheetId),
    queryFn: () => getMyTimesheet(timesheetId),
  })
}

export function useSaveMyTimesheet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ timesheetId, input }: { timesheetId: string | null; input: TimesheetFormInput }) =>
      unwrapActionResult(
        timesheetId ? await updateMyTimesheet(timesheetId, input) : await createMyTimesheet(input)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeTimesheetQueryKeys.all }),
  })
}
