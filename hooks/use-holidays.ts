import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  archiveHolidaySet,
  createHolidaySet,
  getHolidayCountryOptions,
  getHolidaySets,
  updateHolidaySet,
} from "@/app/actions/holidays"
import { unwrapActionResult } from "@/lib/action-result"
import type { HolidaySetFormInput } from "@/lib/holidays"

export const holidayQueryKeys = {
  all: ["holidays"] as const,
  countries: ["holidays", "countries"] as const,
}

export function useHolidaySets() {
  return useQuery({
    queryKey: holidayQueryKeys.all,
    queryFn: () => getHolidaySets(),
  })
}

export function useHolidayCountryOptions() {
  return useQuery({
    queryKey: holidayQueryKeys.countries,
    queryFn: () => getHolidayCountryOptions(),
    staleTime: 30 * 60 * 1000,
  })
}

function useInvalidateHolidaySets() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: holidayQueryKeys.all, exact: true })
}

export function useSaveHolidaySet() {
  const invalidate = useInvalidateHolidaySets()

  return useMutation({
    mutationFn: async ({ holidaySetId, input }: { holidaySetId: string | null; input: HolidaySetFormInput }) =>
      unwrapActionResult(holidaySetId ? await updateHolidaySet(holidaySetId, input) : await createHolidaySet(input)),
    onSuccess: () => invalidate(),
  })
}

export function useArchiveHolidaySet() {
  const invalidate = useInvalidateHolidaySets()

  return useMutation({
    mutationFn: async (holidaySetId: string) => unwrapActionResult(await archiveHolidaySet(holidaySetId)),
    onSuccess: () => invalidate(),
  })
}
