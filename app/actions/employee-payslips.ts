"use server";

import { requireEmployeeSession } from "@/lib/employee-auth";
import type { PayslipItem } from "@/lib/payslips";
import { payslipOrderBy, payslipSelect, toPayslipItem } from "@/lib/payslips/records";
import { prisma } from "@/lib/prisma";

// The employee always comes from the session, so employees only ever see their own payslips.

export async function getMyPayslips(): Promise<PayslipItem[]> {
  const { employeeId } = await requireEmployeeSession();

  try {
    const rows = await prisma.payslips.findMany({
      where: { employee_id: employeeId },
      orderBy: payslipOrderBy,
      select: payslipSelect,
    });
    return rows.map(toPayslipItem);
  } catch (error) {
    console.error("getMyPayslips failed", { employeeId: employeeId.toString(), error });
    throw new Error("Could not load your payslips.");
  }
}

export async function getMyLatestPayslip(): Promise<PayslipItem | null> {
  const { employeeId } = await requireEmployeeSession();

  try {
    const row = await prisma.payslips.findFirst({
      where: { employee_id: employeeId },
      orderBy: payslipOrderBy,
      select: payslipSelect,
    });
    return row ? toPayslipItem(row) : null;
  } catch (error) {
    console.error("getMyLatestPayslip failed", { employeeId: employeeId.toString(), error });
    throw new Error("Could not load your latest payslip.");
  }
}
