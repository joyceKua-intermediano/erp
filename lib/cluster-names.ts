import "server-only"
import { prisma } from "./prisma"

function toPascalName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")
}

// Legacy Filament scopes records by cluster_name (the cluster class name), which isn't always derivable from the company name.
export async function resolveClusterName(companyId: bigint) {
  const existing = await prisma.contracts.findFirst({
    where: { intermediano_company_id: companyId, contract_type: "employee", cluster_name: { not: null } },
    orderBy: { id: "desc" },
    select: { cluster_name: true },
  })
  if (existing?.cluster_name) return existing.cluster_name

  const company = await prisma.intermediano_companies.findFirst({
    where: { id: companyId },
    select: { name: true },
  })
  return company ? toPascalName(company.name) : null
}
