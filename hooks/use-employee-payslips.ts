import { useQuery } from "@tanstack/react-query"
import { getMyLatestPayslip, getMyPayslips } from "@/app/actions/employee-payslips"

export const employeePayslipQueryKeys = {
  all: ["employee", "payslips"] as const,
  list: ["employee", "payslips", "list"] as const,
  latest: ["employee", "payslips", "latest"] as const,
}

export function myPayslipFileUrl(payslipId: string) {
  return `/api/payslips/${payslipId}/file`
}

export function useMyPayslips() {
  return useQuery({
    queryKey: employeePayslipQueryKeys.list,
    queryFn: () => getMyPayslips(),
  })
}

export function useMyLatestPayslip() {
  return useQuery({
    queryKey: employeePayslipQueryKeys.latest,
    queryFn: () => getMyLatestPayslip(),
  })
}
