"use server";

import { requireAdminSession } from "@/lib/auth";
import { clusterIdSchema, getCluster } from "@/lib/clusters";
import type { ClusterEmployee, ContractStatus } from "@/lib/employees";
import { prisma } from "@/lib/prisma";

const PENDING_SIGNATURE = "Pending Signature";

type ContractSnapshot = {
  start_date: Date | null;
  end_date: Date | null;
  signature: string | null;
  admin_signature: string | null;
};

function toIsoDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function isPending(signature: string | null) {
  return !signature || signature === PENDING_SIGNATURE;
}

function deriveContractStatus(contract: ContractSnapshot | undefined, now: Date): ContractStatus {
  if (!contract) return "none";
  if (contract.end_date && contract.end_date < now) return "ended";
  if (contract.start_date && contract.start_date > now) return "upcoming";
  if (isPending(contract.signature) || isPending(contract.admin_signature)) return "pending_signature";
  return "active";
}

export async function getClusterEmployees(clusterId: string): Promise<ClusterEmployee[]> {
  await requireAdminSession();

  const parsedClusterId = clusterIdSchema.safeParse(clusterId);
  if (!parsedClusterId.success) {
    throw new Error("Unknown cluster.");
  }

  const contractClusterNames = [...getCluster(parsedClusterId.data).contractClusterNames];
  const clusterContracts = {
    cluster_name: { in: contractClusterNames },
    deleted_at: null,
  };

  try {
    const employees = await prisma.employees.findMany({
      where: {
        deleted_at: null,
        contracts: { some: clusterContracts },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        consultants: { select: { name: true } },
        contracts: {
          where: clusterContracts,
          orderBy: [{ start_date: "desc" }, { id: "desc" }],
          take: 1,
          select: {
            job_title: true,
            start_date: true,
            end_date: true,
            signature: true,
            admin_signature: true,
            companies: { select: { name: true } },
          },
        },
      },
    });

    const now = new Date();

    return employees.map((employee) => {
      const [contract] = employee.contracts;
      return {
        id: employee.id.toString(),
        name: employee.name,
        email: employee.email,
        position: contract?.job_title ?? null,
        clientCompany: contract?.companies?.name ?? null,
        consultant: employee.consultants?.name ?? null,
        contractStart: toIsoDate(contract?.start_date ?? null),
        contractEnd: toIsoDate(contract?.end_date ?? null),
        contractStatus: deriveContractStatus(contract, now),
      };
    });
  } catch (error) {
    console.error("getClusterEmployees failed", { clusterId: parsedClusterId.data, error });
    throw new Error("Could not load employees for this cluster.");
  }
}
