import "server-only"
import { clusterIdFilter, type ClusterScope } from "@/lib/clusters"
import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"

// Templates without a cluster are shared, so they stay visible to everyone with Configuration access.
export function visibleTemplates(scope: ClusterScope): Prisma.templatesWhereInput {
  const clusterFilter = clusterIdFilter(scope)
  return {
    deleted_at: null,
    ...(clusterFilter && { OR: [{ intermediano_company_id: null }, { intermediano_company_id: clusterFilter }] }),
  }
}

export async function findVisibleTypstSource(templateId: bigint, scope: ClusterScope): Promise<string | null> {
  const template = await prisma.templates.findFirst({
    where: { id: templateId, ...visibleTemplates(scope) },
    select: { typst_source: true },
  })
  return template?.typst_source ?? null
}
