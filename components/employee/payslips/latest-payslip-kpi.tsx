"use client"

import { ReceiptIcon } from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { useMyLatestPayslip } from "@/hooks/use-employee-payslips"

export function LatestPayslipKpi() {
  const { data, isPending, isError } = useMyLatestPayslip()

  const value = isPending ? "…" : isError || !data ? "—" : data.periodLabel
  const hint = isError
    ? "Couldn't load your payslips"
    : !isPending && !data
      ? "No payslips uploaded yet"
      : "Your most recent payroll period"

  return <KpiCard title="Latest payslip" value={value} hint={hint} icon={ReceiptIcon} />
}
