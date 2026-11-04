"use server";

import type { ActionResult } from "@/lib/action-result";
import { requireClusterModule } from "@/lib/auth";
import { pageArgs } from "@/lib/pagination";
import {
  formatPayslipPeriod,
  payslipIdSchema,
  payslipListQuerySchema,
  type ClusterPayslips,
  type PayslipEmployeeOption,
  type PayslipListQuery,
} from "@/lib/payslips";
import {
  clusterPayslipsWhere,
  payslipListWhere,
  payslipOrderBy,
  payslipSelect,
  toPayslipItem,
} from "@/lib/payslips/records";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile } from "@/lib/storage";

// Uploads go through POST /api/payslips, since Server Action bodies are capped at 1 MB.

export async function getClusterPayslips(clusterId: string, query?: PayslipListQuery): Promise<ClusterPayslips> {
  const { clusterId: companyId } = await requireClusterModule(clusterId, "payslips.list", "payslips");
  const listQuery = payslipListQuerySchema.parse(query ?? {});

  try {
    const clusterWhere = clusterPayslipsWhere(companyId);
    const where = payslipListWhere(companyId, listQuery);
    const [rows, total, clusterTotal, employees, latest] = await Promise.all([
      prisma.payslips.findMany({ where, orderBy: payslipOrderBy, select: payslipSelect, ...pageArgs(listQuery.page) }),
      prisma.payslips.count({ where }),
      prisma.payslips.count({ where: clusterWhere }),
      prisma.payslips.groupBy({ by: ["employee_id"], where: clusterWhere }),
      prisma.payslips.findFirst({ where: clusterWhere, orderBy: payslipOrderBy, select: { payslip_period: true } }),
    ]);
    return {
      payslips: rows.map(toPayslipItem),
      total,
      stats: {
        payslips: clusterTotal,
        employees: employees.length,
        latestPeriod: latest ? formatPayslipPeriod(latest.payslip_period) : null,
      },
    };
  } catch (error) {
    console.error("getClusterPayslips failed", { clusterId: companyId.toString(), error });
    throw new Error("Could not load payslips for this cluster.");
  }
}

export async function getPayslipEmployeeOptions(clusterId: string): Promise<PayslipEmployeeOption[]> {
  const { clusterId: companyId } = await requireClusterModule(clusterId, "payslips.create", "payslips");

  try {
    const rows = await prisma.employees.findMany({
      where: { intermediano_company_id: companyId, deleted_at: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return rows.map((row) => ({ id: row.id.toString(), name: row.name }));
  } catch (error) {
    console.error("getPayslipEmployeeOptions failed", { clusterId: companyId.toString(), error });
    throw new Error("Could not load this cluster's employees.");
  }
}

export async function deletePayslip(clusterId: string, payslipId: string): Promise<ActionResult<{ id: string }>> {
  let companyId: bigint;
  try {
    ({ clusterId: companyId } = await requireClusterModule(clusterId, "payslips.delete", "payslips"));
  } catch {
    return { ok: false, error: "You don't have permission to delete payslips in this cluster." };
  }

  const parsedId = payslipIdSchema.safeParse(payslipId);
  if (!parsedId.success) return { ok: false, error: "Unknown payslip." };

  let filePath: string;
  try {
    const where = { id: BigInt(parsedId.data), ...clusterPayslipsWhere(companyId) };
    const row = await prisma.payslips.findFirst({ where, select: { file_path: true } });
    if (!row) return { ok: false, error: "This payslip no longer exists in this cluster." };

    const result = await prisma.payslips.deleteMany({ where });
    if (result.count === 0) return { ok: false, error: "This payslip no longer exists in this cluster." };
    filePath = row.file_path;
  } catch (error) {
    console.error("deletePayslip failed", { clusterId: companyId.toString(), payslipId: parsedId.data, error });
    return { ok: false, error: "Could not delete this payslip. Try again." };
  }

  // The row is already gone, so a leftover file only wastes disk space.
  try {
    await deleteStoredFile(filePath);
  } catch (error) {
    console.error("deletePayslip file cleanup failed", { payslipId: parsedId.data, filePath, error });
  }
  return { ok: true, data: { id: parsedId.data } };
}
