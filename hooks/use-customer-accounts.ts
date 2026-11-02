import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  archiveCustomerAccount,
  createCustomerAccount,
  getCompanyCustomerAccounts,
  getCustomerAccountOptions,
  getCustomerAccounts,
  resetCustomerAccountPassword,
  restoreCustomerAccount,
  updateCustomerAccount,
} from "@/app/actions/customer-accounts"
import { unwrapActionResult } from "@/lib/action-result"
import type {
  CustomerAccountFormInput,
  CustomerAccountListQuery,
  PasswordResetInput,
} from "@/lib/customer-accounts"
import { partnerQueryKeys } from "./use-partners"

export const customerAccountQueryKeys = {
  all: ["customer-accounts"] as const,
  list: ["customer-accounts", "list"] as const,
  company: (companyId: string) => ["customer-accounts", "company", companyId] as const,
  options: ["customer-accounts", "options"] as const,
}

export function useCustomerAccounts(query: CustomerAccountListQuery) {
  return useQuery({
    queryKey: [...customerAccountQueryKeys.list, query] as const,
    queryFn: () => getCustomerAccounts(query),
    placeholderData: keepPreviousData,
  })
}

export function useCompanyCustomerAccounts(companyId: string) {
  return useQuery({
    queryKey: customerAccountQueryKeys.company(companyId),
    queryFn: () => getCompanyCustomerAccounts(companyId),
  })
}

export function useCustomerAccountOptions(enabled = true) {
  return useQuery({
    queryKey: customerAccountQueryKeys.options,
    queryFn: () => getCustomerAccountOptions(),
    enabled,
  })
}

// Partner pages show how many portal accounts each partner has.
function useInvalidateCustomerAccounts() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: customerAccountQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: partnerQueryKeys.all }),
    ])
}

export function useSaveCustomerAccount() {
  const invalidate = useInvalidateCustomerAccounts()

  return useMutation({
    mutationFn: async ({
      accountId,
      account,
      password,
    }: {
      accountId: string | null
      account: CustomerAccountFormInput
      password: string
    }) =>
      unwrapActionResult(
        accountId ? await updateCustomerAccount(accountId, account) : await createCustomerAccount({ account, password })
      ),
    onSuccess: invalidate,
  })
}

export function useResetCustomerAccountPassword() {
  return useMutation({
    mutationFn: async ({ accountId, input }: { accountId: string; input: PasswordResetInput }) =>
      unwrapActionResult(await resetCustomerAccountPassword(accountId, input)),
  })
}

export function useSetCustomerAccountArchived() {
  const invalidate = useInvalidateCustomerAccounts()

  return useMutation({
    mutationFn: async ({ accountId, archived }: { accountId: string; archived: boolean }) =>
      unwrapActionResult(archived ? await archiveCustomerAccount(accountId) : await restoreCustomerAccount(accountId)),
    onSuccess: invalidate,
  })
}
