import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  archiveIntermedianoCompany,
  createIntermedianoCompany,
  getAssignableClusters,
  getClusters,
  getCountryOptions,
  getIntermedianoCompanies,
  getIntermedianoCompany,
  updateIntermedianoCompany,
  updateIntermedianoCompanyModules,
} from "@/app/actions/clusters"
import { unwrapActionResult } from "@/lib/action-result"
import type { ClusterModuleKey } from "@/lib/cluster-modules"
import type { CompanyFormInput } from "@/lib/intermediano-companies"
import { useUiStore } from "@/store/use-ui-store"
import { roleQueryKeys } from "./access-query-keys"

export const clusterQueryKeys = {
  all: ["clusters"] as const,
  assignable: ["clusters", "assignable"] as const,
  companies: ["clusters", "companies"] as const,
  company: (companyId: string) => ["clusters", "companies", companyId] as const,
  countries: ["clusters", "countries"] as const,
}

export function useClusters() {
  return useQuery({
    queryKey: clusterQueryKeys.all,
    queryFn: () => getClusters(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useAssignableClusters() {
  return useQuery({
    queryKey: clusterQueryKeys.assignable,
    queryFn: () => getAssignableClusters(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useActiveCluster() {
  const activeCluster = useUiStore((state) => state.activeCluster)
  const { data } = useClusters()

  if (!activeCluster) return null
  return data?.find((cluster) => cluster.id === activeCluster) ?? null
}

export function useIntermedianoCompanies() {
  return useQuery({
    queryKey: clusterQueryKeys.companies,
    queryFn: () => getIntermedianoCompanies(),
  })
}

export function useIntermedianoCompany(companyId: string) {
  return useQuery({
    queryKey: clusterQueryKeys.company(companyId),
    queryFn: () => getIntermedianoCompany(companyId),
  })
}

export function useCountryOptions() {
  return useQuery({
    queryKey: clusterQueryKeys.countries,
    queryFn: () => getCountryOptions(),
    staleTime: 30 * 60 * 1000,
  })
}

function useInvalidateCompanies() {
  const queryClient = useQueryClient()
  return (skipCompanyId?: string) => {
    const skippedKey = skipCompanyId ? clusterQueryKeys.company(skipCompanyId).join("/") : null
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: clusterQueryKeys.all,
        predicate: (query) => query.queryKey.join("/") !== skippedKey,
      }),
      queryClient.invalidateQueries({ queryKey: roleQueryKeys.all }),
    ])
  }
}

export function useSaveIntermedianoCompany() {
  const invalidate = useInvalidateCompanies()

  return useMutation({
    mutationFn: async ({ companyId, input }: { companyId: string | null; input: CompanyFormInput }) =>
      unwrapActionResult(
        companyId ? await updateIntermedianoCompany(companyId, input) : await createIntermedianoCompany(input)
      ),
    onSuccess: () => invalidate(),
  })
}

export function useSaveCompanyModules() {
  const invalidate = useInvalidateCompanies()

  return useMutation({
    mutationFn: async ({ companyId, modules }: { companyId: string; modules: ClusterModuleKey[] }) =>
      unwrapActionResult(await updateIntermedianoCompanyModules(companyId, modules)),
    onSuccess: () => invalidate(),
  })
}

export function useArchiveIntermedianoCompany() {
  const invalidate = useInvalidateCompanies()

  return useMutation({
    mutationFn: async (companyId: string) => unwrapActionResult(await archiveIntermedianoCompany(companyId)),
    // Refetching the archived company's own detail would flash "not found" before the page navigates away.
    onSuccess: (_result, companyId) => invalidate(companyId),
  })
}
