"use server";

import { contractStatusWhere, deriveContractStatus, isSigned, toContractKind } from "@/lib/contracts";
import { requireCustomerSession } from "@/lib/customer-auth";
import {
  customerContractListQuerySchema,
  customerContractListWhere,
  customerContractsWhere,
  type CustomerContract,
  type CustomerContractListQuery,
  type CustomerContracts,
} from "@/lib/customer-portal";
import type { Prisma } from "@/lib/generated/prisma/client";
import { pageArgs } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

function toIsoDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

const customerContractSelect = {
  id: true,
  contract_type: true,
  employee_id: true,
  job_title: true,
  start_date: true,
  end_date: true,
  signature: true,
  admin_signature: true,
  template_id: true,
  employees: { select: { name: true } },
  companies: { select: { name: true } },
} satisfies Prisma.contractsSelect;

type CustomerContractRow = Prisma.contractsGetPayload<{ select: typeof customerContractSelect }>;

function toCustomerContract(contract: CustomerContractRow, now: Date): CustomerContract {
  return {
    id: contract.id.toString(),
    kind: toContractKind(contract.contract_type),
    employeeId: contract.employee_id.toString(),
    employeeName: contract.employees.name,
    counterparty: contract.companies?.name ?? null,
    jobTitle: contract.job_title,
    startDate: toIsoDate(contract.start_date),
    endDate: toIsoDate(contract.end_date),
    status: deriveContractStatus(contract, now),
    employeeSigned: isSigned(contract.signature),
    adminSigned: isSigned(contract.admin_signature),
    hasTemplate: contract.template_id !== null,
  };
}

export async function getCustomerContracts(query?: CustomerContractListQuery): Promise<CustomerContracts> {
  const { companyId } = await requireCustomerSession();
  const listQuery = customerContractListQuerySchema.parse(query ?? {});

  try {
    const now = new Date();
    const scope = customerContractsWhere(companyId);
    const where = customerContractListWhere(companyId, listQuery);
    const [contracts, total, scopeTotal, active, pendingSignature] = await Promise.all([
      prisma.contracts.findMany({
        where,
        orderBy: [{ start_date: "desc" }, { id: "desc" }],
        select: customerContractSelect,
        ...pageArgs(listQuery.page),
      }),
      prisma.contracts.count({ where }),
      prisma.contracts.count({ where: scope }),
      prisma.contracts.count({ where: { AND: [scope, contractStatusWhere("active", now)] } }),
      prisma.contracts.count({ where: { AND: [scope, contractStatusWhere("pending_signature", now)] } }),
    ]);

    return {
      contracts: contracts.map((contract) => toCustomerContract(contract, now)),
      total,
      stats: { contracts: scopeTotal, active, pendingSignature },
    };
  } catch (error) {
    console.error("getCustomerContracts failed", { companyId: companyId.toString(), error });
    throw new Error("Could not load your contracts.");
  }
}
