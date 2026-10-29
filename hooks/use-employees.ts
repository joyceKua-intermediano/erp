import { keepPreviousData, skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  archiveEmployee,
  createEmployee,
  getClusterEmployees,
  getConsultantOptions,
  getEmployee,
  updateEmployee,
} from "@/app/actions/employees"
import { unwrapActionResult } from "@/lib/action-result"
import type { ClusterId } from "@/lib/clusters"
import type { EmployeeFormInput, EmployeeListQuery } from "@/lib/employees"
import { useUiStore } from "@/store/use-ui-store"
import { clusterQueryKeys } from "./use-clusters"

export const employeeQueryKeys = {
  cluster: (clusterId: ClusterId | null) => ["cluster", clusterId, "employees"] as const,
  detail: (clusterId: ClusterId | null, employeeId: string) => ["cluster", clusterId, "employees", employeeId] as const,
  consultants: (clusterId: ClusterId | null) => ["cluster", clusterId, "consultants"] as const,
}

export function useEmployees(query: EmployeeListQuery) {
  const activeCluster = useUiStore((state) => state.activeCluster)

  return useQuery({
    queryKey: [...employeeQueryKeys.cluster(activeCluster), "list", query] as const,
    queryFn: activeCluster ? () => getClusterEmployees(activeCluster, query) : skipToken,
    placeholderData: keepPreviousData,
  })
}

export function useEmployee(employeeId: string) {
  const activeCluster = useUiStore((state) => state.activeCluster)

  return useQuery({
    queryKey: employeeQueryKeys.detail(activeCluster, employeeId),
    queryFn: activeCluster ? () => getEmployee(activeCluster, employeeId) : skipToken,
  })
}

export function useConsultantOptions() {
  const activeCluster = useUiStore((state) => state.activeCluster)

  return useQuery({
    queryKey: employeeQueryKeys.consultants(activeCluster),
    queryFn: activeCluster ? () => getConsultantOptions(activeCluster) : skipToken,
    staleTime: 5 * 60 * 1000,
  })
}

function useInvalidateEmployees() {
  const queryClient = useQueryClient()
  return (clusterId: ClusterId, skipEmployeeId?: string) => {
    const skippedKey = skipEmployeeId ? employeeQueryKeys.detail(clusterId, skipEmployeeId).join("/") : null
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: employeeQueryKeys.cluster(clusterId),
        predicate: (query) => query.queryKey.join("/") !== skippedKey,
      }),
      queryClient.invalidateQueries({ queryKey: clusterQueryKeys.companies }),
    ])
  }
}

function requireActiveCluster(clusterId: ClusterId | null): ClusterId {
  if (!clusterId) throw new Error("Choose a cluster first.")
  return clusterId
}

export function useSaveEmployee() {
  const activeCluster = useUiStore((state) => state.activeCluster)
  const invalidate = useInvalidateEmployees()

  return useMutation({
    mutationFn: async ({ employeeId, input }: { employeeId: string | null; input: EmployeeFormInput }) => {
      const clusterId = requireActiveCluster(activeCluster)
      const data = unwrapActionResult(
        employeeId ? await updateEmployee(clusterId, employeeId, input) : await createEmployee(clusterId, input)
      )
      return { ...data, clusterId }
    },
    onSuccess: ({ clusterId }) => invalidate(clusterId),
  })
}

export function useArchiveEmployee() {
  const activeCluster = useUiStore((state) => state.activeCluster)
  const invalidate = useInvalidateEmployees()

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const clusterId = requireActiveCluster(activeCluster)
      return { ...unwrapActionResult(await archiveEmployee(clusterId, employeeId)), clusterId }
    },
    // Refetching the archived employee's own detail would flash "not found" before the page navigates away.
    onSuccess: ({ id, clusterId }) => invalidate(clusterId, id),
  })
}
