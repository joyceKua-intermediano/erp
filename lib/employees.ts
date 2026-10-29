import { z } from "zod"
import { listSearchSchema, pageNumberSchema } from "./pagination"

export const contractStatuses = ["active", "pending_signature", "upcoming", "ended", "none"] as const

export type ContractStatus = (typeof contractStatuses)[number]

export type ClusterEmployee = {
  id: string
  name: string
  email: string
  position: string | null
  clientCompany: string | null
  consultant: string | null
  contractStart: string | null
  contractEnd: string | null
  contractStatus: ContractStatus
}

export type ClusterEmployees = {
  // One page of employees matching the query.
  employees: ClusterEmployee[]
  // How many employees match the query across all pages.
  total: number
  // Figures for the whole cluster, ignoring the query; statuses come from each employee's latest contract.
  stats: { employees: number; active: number; pendingSignature: number }
}

export const employeeListQuerySchema = z.object({
  page: pageNumberSchema,
  search: listSearchSchema,
})

export type EmployeeListQuery = z.output<typeof employeeListQuerySchema>

export const contractStatusLabels: Record<ContractStatus, string> = {
  active: "Active",
  pending_signature: "Pending signature",
  upcoming: "Upcoming",
  ended: "Ended",
  none: "No contract",
}

export type EmployeeContract = {
  id: string
  jobTitle: string | null
  clientCompany: string | null
  startDate: string | null
  endDate: string | null
  status: ContractStatus
}

export type EmployeeDetail = {
  id: string
  name: string
  email: string
  consultantId: string | null
  consultantName: string | null
  clusterId: string
  clusterLabel: string
  createdAt: string | null
  contracts: EmployeeContract[]
}

export type ConsultantOption = {
  id: string
  name: string
}

export const employeeIdSchema = z.string().regex(/^\d+$/, "Invalid employee id.")

export const employeeFormSchema = z.object({
  name: z.string().trim().min(1, "Enter the employee's full name.").max(255, "Name is too long."),
  email: z.string().trim().toLowerCase().max(255, "Email is too long.").pipe(z.email("Enter a valid email.")),
  consultantId: z.union([z.literal(""), z.string().regex(/^\d+$/, "Choose a consultant.")]),
})

export type EmployeeFormInput = z.input<typeof employeeFormSchema>

export function toEmployeeFormInput(employee: EmployeeDetail | null): EmployeeFormInput {
  return {
    name: employee?.name ?? "",
    email: employee?.email ?? "",
    consultantId: employee?.consultantId ?? "",
  }
}
