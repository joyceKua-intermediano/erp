import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createUser, getUsers, revokeUserAccess, updateUser } from "@/app/actions/users"
import { unwrapActionResult } from "@/lib/action-result"
import type { UserFormInput } from "@/lib/users"
import { roleQueryKeys, userQueryKeys } from "./access-query-keys"

export function useUsers() {
  return useQuery({
    queryKey: userQueryKeys.all,
    queryFn: () => getUsers(),
  })
}

function useInvalidateAccess() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: roleQueryKeys.all }),
    ])
}

export function useSaveUser() {
  const invalidate = useInvalidateAccess()

  return useMutation({
    mutationFn: async ({ userId, input }: { userId: string | null; input: UserFormInput }) =>
      unwrapActionResult(userId ? await updateUser(userId, input) : await createUser(input)),
    onSuccess: invalidate,
  })
}

export function useRevokeUserAccess() {
  const invalidate = useInvalidateAccess()

  return useMutation({
    mutationFn: async (userId: string) => unwrapActionResult(await revokeUserAccess(userId)),
    onSuccess: invalidate,
  })
}
