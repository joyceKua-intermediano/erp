import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createRole, deleteRole, getRole, getRoles, updateRole } from "@/app/actions/roles"
import { unwrapActionResult } from "@/lib/action-result"
import type { RoleFormInput } from "@/lib/roles"
import { roleQueryKeys, userQueryKeys } from "./access-query-keys"

export function useRoles() {
  return useQuery({
    queryKey: roleQueryKeys.all,
    queryFn: () => getRoles(),
  })
}

export function useRole(roleId: string | null) {
  return useQuery({
    queryKey: roleQueryKeys.detail(roleId ?? "new"),
    queryFn: () => getRole(roleId ?? ""),
    enabled: roleId !== null,
  })
}

export function useSaveRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roleId, input }: { roleId: string | null; input: RoleFormInput }) =>
      unwrapActionResult(roleId ? await updateRole(roleId, input) : await createRole(input)),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: roleQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: userQueryKeys.all }),
      ]),
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (roleId: string) => unwrapActionResult(await deleteRole(roleId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roleQueryKeys.all }),
  })
}
