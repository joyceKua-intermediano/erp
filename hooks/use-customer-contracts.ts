import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { getCustomerContracts } from "@/app/actions/customer-contracts"
import type { CustomerContractListQuery } from "@/lib/customer-portal"

export const customerContractQueryKeys = {
  all: ["customer", "contracts"] as const,
  list: ["customer", "contracts", "list"] as const,
}

export function useCustomerContracts(query: CustomerContractListQuery) {
  return useQuery({
    queryKey: [...customerContractQueryKeys.list, query] as const,
    queryFn: () => getCustomerContracts(query),
    placeholderData: keepPreviousData,
  })
}
