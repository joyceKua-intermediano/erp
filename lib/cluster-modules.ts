import { z } from "zod"

// Stored in intermediano_company_modules.module_key; renaming a key orphans the saved rows.
export const clusterModuleKeys = [
  "quotations",
  "employees",
  "contracts",
  "timesheets",
  "expenses",
  "payroll",
  "partner",
  "payslips",
  "invoices",
  "msp_payroll",
] as const

export type ClusterModuleKey = (typeof clusterModuleKeys)[number]

export const clusterModuleKeySchema = z.enum(clusterModuleKeys)

export const defaultClusterModules: ClusterModuleKey[] = [
  "quotations",
  "employees",
  "contracts",
  "timesheets",
  "expenses",
  "payroll",
]

export const clusterModuleDetails: Record<ClusterModuleKey, { label: string; description: string }> = {
  quotations: { label: "Quotations", description: "Payroll cost quotes for customers." },
  employees: { label: "Employees", description: "Workers employed by this entity." },
  contracts: { label: "Contracts", description: "Customer and employee contracts." },
  timesheets: { label: "Timesheets", description: "Hours submitted by employees." },
  expenses: { label: "Expenses", description: "Employee expense claims." },
  payroll: { label: "Payroll", description: "Monthly payroll runs." },
  partner: {
    label: "Partner (EOR)",
    description: "Quotations, contracts and payroll for workers employed through a local partner in another country.",
  },
  payslips: { label: "Payslips", description: "Payslips issued to employees." },
  invoices: { label: "Invoices", description: "Customer invoices issued by this entity." },
  msp_payroll: { label: "MSP payroll", description: "Managed service provider payroll runs." },
}

export function isClusterModuleKey(value: string): value is ClusterModuleKey {
  return (clusterModuleKeys as readonly string[]).includes(value)
}

export function toClusterModules(rows: { module_key: string }[]): ClusterModuleKey[] {
  return clusterModuleKeys.filter((key) => rows.some((row) => row.module_key === key))
}
