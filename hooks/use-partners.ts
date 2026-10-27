import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  archivePartner,
  createPartner,
  getPartner,
  getPartnerCountryOptions,
  getPartners,
  updatePartner,
} from "@/app/actions/partners"
import { unwrapActionResult } from "@/lib/action-result"
import type { PartnerFormInput } from "@/lib/partners"

export const partnerQueryKeys = {
  all: ["partners"] as const,
  detail: (partnerId: string) => ["partners", partnerId] as const,
  countries: ["partners", "countries"] as const,
}

export function usePartners() {
  return useQuery({
    queryKey: partnerQueryKeys.all,
    queryFn: () => getPartners(),
  })
}

export function usePartner(partnerId: string) {
  return useQuery({
    queryKey: partnerQueryKeys.detail(partnerId),
    queryFn: () => getPartner(partnerId),
  })
}

export function usePartnerCountryOptions() {
  return useQuery({
    queryKey: partnerQueryKeys.countries,
    queryFn: () => getPartnerCountryOptions(),
    staleTime: 30 * 60 * 1000,
  })
}

function useInvalidatePartners() {
  const queryClient = useQueryClient()
  return (skipPartnerId?: string) => {
    const skippedKey = skipPartnerId ? partnerQueryKeys.detail(skipPartnerId).join("/") : null
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: partnerQueryKeys.all,
        predicate: (query) => query.queryKey.join("/") !== skippedKey,
      }),
      // Contract lists and details show the partner's name.
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "cluster" && query.queryKey[2] === "contracts",
      }),
    ])
  }
}

export function useSavePartner() {
  const invalidate = useInvalidatePartners()

  return useMutation({
    mutationFn: async ({ partnerId, input }: { partnerId: string | null; input: PartnerFormInput }) =>
      unwrapActionResult(partnerId ? await updatePartner(partnerId, input) : await createPartner(input)),
    onSuccess: () => invalidate(),
  })
}

export function useArchivePartner() {
  const invalidate = useInvalidatePartners()

  return useMutation({
    mutationFn: async (partnerId: string) => unwrapActionResult(await archivePartner(partnerId)),
    // Refetching the archived partner's own detail would flash "not found" before the page navigates away.
    onSuccess: (_result, partnerId) => invalidate(partnerId),
  })
}
