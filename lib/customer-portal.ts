import { z } from "zod"
import type { ClusterContract } from "./contracts"
import type { Prisma } from "./generated/prisma/client"
import { listSearchSchema, pageNumberSchema } from "./pagination"

// Customer portal accounts are legacy `customers` rows. Everything a customer sees is scoped to their
// company_id: the timesheets, vacation requests and expense claims billed to it, and its contracts.

type PortalAccount = {
  company_id: bigint | null
  companies?: { deleted_at: Date | null } | null
}

// Partner accounts (partner_id without company_id) aren't supported yet, and an archived company closes the portal.
export function canUseCustomerPortal(account: PortalAccount) {
  return account.company_id !== null && !account.companies?.deleted_at
}

export function customerTimesheetsWhere(companyId: bigint) {
  return { company_id: companyId } satisfies Prisma.monthly_timesheetsWhereInput
}

export function customerVacationsWhere(companyId: bigint) {
  return { company_id: companyId } satisfies Prisma.vacation_requestsWhereInput
}

export function customerExpensesWhere(companyId: bigint) {
  return { company_id: companyId } satisfies Prisma.employee_expensesWhereInput
}

// The customer's own service contracts with Intermediano and the employment contracts of the workers placed with it.
export const customerContractKinds = ["customer", "employee"] as const

export type CustomerContractKind = (typeof customerContractKinds)[number]

export function customerContractsWhere(companyId: bigint) {
  return {
    company_id: companyId,
    deleted_at: null,
    contract_type: { in: [...customerContractKinds] },
  } satisfies Prisma.contractsWhereInput
}

export const customerContractListQuerySchema = z.object({
  page: pageNumberSchema,
  search: listSearchSchema,
  kind: z.enum(customerContractKinds).nullable().catch(null),
})

export type CustomerContractListQuery = z.output<typeof customerContractListQuerySchema>

export function customerContractListWhere(companyId: bigint, query: CustomerContractListQuery): Prisma.contractsWhereInput {
  const filters: Prisma.contractsWhereInput[] = [customerContractsWhere(companyId)]
  if (query.search) {
    filters.push({
      OR: [{ employees: { name: { contains: query.search } } }, { job_title: { contains: query.search } }],
    })
  }
  if (query.kind) filters.push({ contract_type: query.kind })
  return { AND: filters }
}

export type CustomerContract = ClusterContract & {
  // False when no template is attached, so there is no PDF to download.
  hasTemplate: boolean
}

export type CustomerContracts = {
  // One page of contracts matching the query.
  contracts: CustomerContract[]
  // How many contracts match the query across all pages.
  total: number
  // Figures for all of the customer's contracts, ignoring the query.
  stats: { contracts: number; active: number; pendingSignature: number }
}

export type CustomerDashboard = {
  companyName: string
  pending: { timesheets: number; vacations: number; expenses: number }
  activeContracts: number
}

export function customerContractPdfUrl(contractId: string, download = false) {
  const base = `/api/customer/contracts/${contractId}/pdf`
  return download ? `${base}?download=1` : base
}
