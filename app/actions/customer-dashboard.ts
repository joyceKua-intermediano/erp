"use server";

import { contractStatusWhere } from "@/lib/contracts";
import { requireCustomerSession } from "@/lib/customer-auth";
import {
  customerContractsWhere,
  customerExpensesWhere,
  customerTimesheetsWhere,
  customerVacationsWhere,
  type CustomerDashboard,
} from "@/lib/customer-portal";
import { pendingExpenseWhere } from "@/lib/expenses/records";
import { prisma } from "@/lib/prisma";
import { pendingTimesheetWhere } from "@/lib/timesheets/records";
import { pendingVacationWhere } from "@/lib/vacations/records";

export async function getCustomerDashboard(): Promise<CustomerDashboard> {
  const { companyId } = await requireCustomerSession();

  try {
    const [company, timesheets, vacations, expenses, activeContracts] = await Promise.all([
      prisma.companies.findUnique({ where: { id: companyId }, select: { name: true } }),
      prisma.monthly_timesheets.count({ where: { AND: [customerTimesheetsWhere(companyId), pendingTimesheetWhere] } }),
      prisma.vacation_requests.count({ where: { AND: [customerVacationsWhere(companyId), pendingVacationWhere] } }),
      prisma.employee_expenses.count({ where: { AND: [customerExpensesWhere(companyId), pendingExpenseWhere] } }),
      prisma.contracts.count({
        where: { AND: [customerContractsWhere(companyId), contractStatusWhere("active", new Date())] },
      }),
    ]);

    return {
      companyName: company?.name ?? "Your company",
      pending: { timesheets, vacations, expenses },
      activeContracts,
    };
  } catch (error) {
    console.error("getCustomerDashboard failed", { companyId: companyId.toString(), error });
    throw new Error("Could not load your overview.");
  }
}
