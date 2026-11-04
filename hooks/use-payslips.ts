import { keepPreviousData, skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { deletePayslip, getClusterPayslips, getPayslipEmployeeOptions } from "@/app/actions/payslips"
import { unwrapActionResult } from "@/lib/action-result"
import type { ClusterId } from "@/lib/clusters"
import type { PayslipListQuery, PayslipUploadInput } from "@/lib/payslips"
import { useUiStore } from "@/store/use-ui-store"

export const payslipQueryKeys = {
  cluster: (clusterId: ClusterId | null) => ["cluster", clusterId, "payslips"] as const,
  list: (clusterId: ClusterId | null) => ["cluster", clusterId, "payslips", "list"] as const,
  employeeOptions: (clusterId: ClusterId | null) => ["cluster", clusterId, "payslips", "employee-options"] as const,
}

export function payslipFileUrl(clusterId: ClusterId, payslipId: string) {
  return `/api/payslips/${payslipId}/file?cluster=${encodeURIComponent(clusterId)}`
}

export function usePayslips(query: PayslipListQuery) {
  const activeCluster = useUiStore((state) => state.activeCluster)

  return useQuery({
    queryKey: [...payslipQueryKeys.list(activeCluster), query] as const,
    queryFn: activeCluster ? () => getClusterPayslips(activeCluster, query) : skipToken,
    placeholderData: keepPreviousData,
  })
}

export function usePayslipEmployeeOptions(enabled: boolean) {
  const activeCluster = useUiStore((state) => state.activeCluster)

  return useQuery({
    queryKey: payslipQueryKeys.employeeOptions(activeCluster),
    queryFn: activeCluster && enabled ? () => getPayslipEmployeeOptions(activeCluster) : skipToken,
  })
}

export function useDeletePayslip() {
  const activeCluster = useUiStore((state) => state.activeCluster)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payslipId: string) => {
      if (!activeCluster) throw new Error("Choose a cluster first.")
      const data = unwrapActionResult(await deletePayslip(activeCluster, payslipId))
      return { ...data, clusterId: activeCluster }
    },
    onSuccess: ({ clusterId }) => queryClient.invalidateQueries({ queryKey: payslipQueryKeys.cluster(clusterId) }),
  })
}

// Payslips go to a route handler, since Server Action bodies are capped at 1 MB.
async function uploadPayslip(clusterId: ClusterId, input: PayslipUploadInput, file: File): Promise<string> {
  const body = new FormData()
  body.append("employeeId", input.employeeId)
  body.append("period", input.period)
  body.append("file", file)

  let response: Response
  try {
    response = await fetch(`/api/payslips?cluster=${encodeURIComponent(clusterId)}`, { method: "POST", body })
  } catch {
    throw new Error("Could not upload this payslip. Check your connection and try again.")
  }

  const result: unknown = await response.json().catch(() => null)
  const payload = result && typeof result === "object" ? (result as { id?: unknown; error?: unknown }) : {}
  if (!response.ok || typeof payload.id !== "string") {
    throw new Error(typeof payload.error === "string" ? payload.error : "Could not upload this payslip. Try again.")
  }
  return payload.id
}

export function useUploadPayslip() {
  const activeCluster = useUiStore((state) => state.activeCluster)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ input, file }: { input: PayslipUploadInput; file: File }) => {
      if (!activeCluster) throw new Error("Choose a cluster first.")
      const id = await uploadPayslip(activeCluster, input, file)
      return { id, clusterId: activeCluster }
    },
    onSuccess: ({ clusterId }) => queryClient.invalidateQueries({ queryKey: payslipQueryKeys.cluster(clusterId) }),
  })
}
