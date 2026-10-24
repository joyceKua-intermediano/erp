import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  archiveConsultant,
  createConsultant,
  getConsultant,
  getConsultantCountryOptions,
  getConsultants,
  updateConsultant,
} from "@/app/actions/consultants"
import { unwrapActionResult } from "@/lib/action-result"
import type { ConsultantFormInput } from "@/lib/consultants"

export const consultantQueryKeys = {
  all: ["consultants"] as const,
  detail: (consultantId: string) => ["consultants", consultantId] as const,
  countries: ["consultants", "countries"] as const,
}

export function useConsultants() {
  return useQuery({
    queryKey: consultantQueryKeys.all,
    queryFn: () => getConsultants(),
  })
}

export function useConsultant(consultantId: string) {
  return useQuery({
    queryKey: consultantQueryKeys.detail(consultantId),
    queryFn: () => getConsultant(consultantId),
  })
}

export function useConsultantCountryOptions() {
  return useQuery({
    queryKey: consultantQueryKeys.countries,
    queryFn: () => getConsultantCountryOptions(),
    staleTime: 30 * 60 * 1000,
  })
}

function useInvalidateConsultants() {
  const queryClient = useQueryClient()
  return (skipConsultantId?: string) => {
    const skippedKey = skipConsultantId ? consultantQueryKeys.detail(skipConsultantId).join("/") : null
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: consultantQueryKeys.all,
        predicate: (query) => query.queryKey.join("/") !== skippedKey,
      }),
      // Employee lists show consultant names, and the employee form lists consultants per cluster.
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "cluster" && (query.queryKey[2] === "employees" || query.queryKey[2] === "consultants"),
      }),
    ])
  }
}

export function useSaveConsultant() {
  const invalidate = useInvalidateConsultants()

  return useMutation({
    mutationFn: async ({ consultantId, input }: { consultantId: string | null; input: ConsultantFormInput }) =>
      unwrapActionResult(
        consultantId ? await updateConsultant(consultantId, input) : await createConsultant(input)
      ),
    onSuccess: () => invalidate(),
  })
}

export function useArchiveConsultant() {
  const invalidate = useInvalidateConsultants()

  return useMutation({
    mutationFn: async (consultantId: string) => unwrapActionResult(await archiveConsultant(consultantId)),
    // Refetching the archived consultant's own detail would flash "not found" before the page navigates away.
    onSuccess: (_result, consultantId) => invalidate(consultantId),
  })
}
