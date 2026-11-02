import { useQuery } from "@tanstack/react-query"
import { getCustomerDashboard } from "@/app/actions/customer-dashboard"

export const customerDashboardQueryKeys = {
  all: ["customer", "dashboard"] as const,
}

export function useCustomerDashboard() {
  return useQuery({
    queryKey: customerDashboardQueryKeys.all,
    queryFn: () => getCustomerDashboard(),
  })
}
