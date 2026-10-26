import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  archiveContract,
  createContract,
  getClusterContracts,
  getContract,
  getContractFormOptions,
  updateContract,
} from "@/app/actions/contracts"
import { unwrapActionResult } from "@/lib/action-result"
import type { ClusterId } from "@/lib/clusters"
import type { ContractFormInput } from "@/lib/contracts"
import { useUiStore } from "@/store/use-ui-store"
import { employeeQueryKeys } from "./use-employees"

export const contractQueryKeys = {
  cluster: (clusterId: ClusterId | null) => ["cluster", clusterId, "contracts"] as const,
  detail: (clusterId: ClusterId | null, contractId: string) => ["cluster", clusterId, "contracts", contractId] as const,
  formOptions: (clusterId: ClusterId | null) => ["cluster", clusterId, "contract-form-options"] as const,
}

export function useContracts() {
  const activeCluster = useUiStore((state) => state.activeCluster)

  return useQuery({
    queryKey: contractQueryKeys.cluster(activeCluster),
    queryFn: activeCluster ? () => getClusterContracts(activeCluster) : skipToken,
  })
}

export function useContract(contractId: string) {
  const activeCluster = useUiStore((state) => state.activeCluster)

  return useQuery({
    queryKey: contractQueryKeys.detail(activeCluster, contractId),
    queryFn: activeCluster ? () => getContract(activeCluster, contractId) : skipToken,
  })
}

export function useContractFormOptions() {
  const activeCluster = useUiStore((state) => state.activeCluster)

  return useQuery({
    queryKey: contractQueryKeys.formOptions(activeCluster),
    queryFn: activeCluster ? () => getContractFormOptions(activeCluster) : skipToken,
    staleTime: 5 * 60 * 1000,
  })
}

function useInvalidateContracts() {
  const queryClient = useQueryClient()
  return (clusterId: ClusterId, skipContractId?: string) => {
    const skippedKey = skipContractId ? contractQueryKeys.detail(clusterId, skipContractId).join("/") : null
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: contractQueryKeys.cluster(clusterId),
        predicate: (query) => query.queryKey.join("/") !== skippedKey,
      }),
      // Employee rows show their latest contract's position and status.
      queryClient.invalidateQueries({ queryKey: employeeQueryKeys.cluster(clusterId) }),
    ])
  }
}

function requireActiveCluster(clusterId: ClusterId | null): ClusterId {
  if (!clusterId) throw new Error("Choose a cluster first.")
  return clusterId
}

export function useSaveContract() {
  const activeCluster = useUiStore((state) => state.activeCluster)
  const invalidate = useInvalidateContracts()

  return useMutation({
    mutationFn: async ({ contractId, input }: { contractId: string | null; input: ContractFormInput }) => {
      const clusterId = requireActiveCluster(activeCluster)
      const data = unwrapActionResult(
        contractId ? await updateContract(clusterId, contractId, input) : await createContract(clusterId, input)
      )
      return { ...data, clusterId }
    },
    onSuccess: ({ clusterId }) => invalidate(clusterId),
  })
}

export function useArchiveContract() {
  const activeCluster = useUiStore((state) => state.activeCluster)
  const invalidate = useInvalidateContracts()

  return useMutation({
    mutationFn: async (contractId: string) => {
      const clusterId = requireActiveCluster(activeCluster)
      return { ...unwrapActionResult(await archiveContract(clusterId, contractId)), clusterId }
    },
    // Refetching the archived contract's own detail would flash "not found" before the page navigates away.
    onSuccess: ({ id, clusterId }) => invalidate(clusterId, id),
  })
}
