import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getCustomerTimesheet,
  getCustomerTimesheets,
  reviewCustomerTimesheet,
} from "@/app/actions/customer-timesheets"
import { unwrapActionResult } from "@/lib/action-result"
import type { TimesheetListQuery, TimesheetReviewInput } from "@/lib/timesheets"
import { customerDashboardQueryKeys } from "./use-customer-dashboard"

export const customerTimesheetQueryKeys = {
  all: ["customer", "timesheets"] as const,
  list: ["customer", "timesheets", "list"] as const,
  detail: (timesheetId: string) => ["customer", "timesheets", timesheetId] as const,
}

export function useCustomerTimesheets(query: TimesheetListQuery) {
  return useQuery({
    queryKey: [...customerTimesheetQueryKeys.list, query] as const,
    queryFn: () => getCustomerTimesheets(query),
    placeholderData: keepPreviousData,
  })
}

export function useCustomerTimesheet(timesheetId: string) {
  return useQuery({
    queryKey: customerTimesheetQueryKeys.detail(timesheetId),
    queryFn: () => getCustomerTimesheet(timesheetId),
  })
}

export function useReviewCustomerTimesheet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ timesheetId, input }: { timesheetId: string; input: TimesheetReviewInput }) =>
      unwrapActionResult(await reviewCustomerTimesheet(timesheetId, input)),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: customerTimesheetQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: customerDashboardQueryKeys.all }),
      ]),
  })
}
