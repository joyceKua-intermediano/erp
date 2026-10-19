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

export const contractStatusLabels: Record<ContractStatus, string> = {
  active: "Active",
  pending_signature: "Pending signature",
  upcoming: "Upcoming",
  ended: "Ended",
  none: "No contract",
}
