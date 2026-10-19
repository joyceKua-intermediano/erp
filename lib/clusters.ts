import { z } from "zod"

export const clusters = [
  { id: "brasil-ltda", label: "Brasil Ltda", contractClusterNames: ["IntermedianoDoBrasilLtda"] },
  {
    id: "canada",
    label: "Canada",
    contractClusterNames: ["IntermedianoCanada", "ClientContractCanada", "PartnerContractCanada"],
  },
  { id: "chile-spa", label: "Chile SPA", contractClusterNames: ["IntermedianoChileSPA"] },
  { id: "colombia-sas", label: "Colombia SAS", contractClusterNames: ["IntermedianoColombiaSAS"] },
  { id: "costa-rica", label: "Costa Rica", contractClusterNames: ["IntermedianoCostaRica"] },
  { id: "ecuador-sas", label: "Ecuador SAS", contractClusterNames: ["IntermedianoEcuadorSAS"] },
  {
    id: "global-services-ltda",
    label: "Global Services Ltda",
    contractClusterNames: ["IntermedianoGlobalServicesLtda"],
  },
  { id: "hong-kong", label: "Hong Kong", contractClusterNames: ["IntermedianoHongkong"] },
  { id: "mexico-sc", label: "Mexico SC", contractClusterNames: ["IntermedianoMexicoSC"] },
  { id: "peru-sac", label: "Peru SAC", contractClusterNames: ["IntermedianoPeruSAC"] },
  {
    id: "uruguay",
    label: "Uruguay",
    contractClusterNames: ["IntermedianoUruguay", "ClientContractUruguay", "PartnerContractUruguay"],
  },
] as const satisfies readonly { id: string; label: string; contractClusterNames: readonly string[] }[]

export type Cluster = (typeof clusters)[number]
export type ClusterId = Cluster["id"]

export const clusterIdSchema = z.enum(
  clusters.map((cluster) => cluster.id) as [ClusterId, ...ClusterId[]],
)

export function getCluster(id: ClusterId): Cluster {
  const cluster = clusters.find((entry) => entry.id === id)
  if (!cluster) {
    throw new Error(`Unknown cluster "${id}".`)
  }
  return cluster
}
