import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { ExpenseWorkspace } from "@/components/expenses/expense-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Expenses",
};

async function ExpensesSlot() {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "expenses.list")) {
    return <AccessDenied message="Ask an administrator for access to Expenses." />;
  }

  return <ExpenseWorkspace />;
}

export default function ExpensesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Cluster workspace"
        title="Expenses"
        description="Expense claims from employees in the cluster selected in the header, reviewed item by item."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <ExpensesSlot />
      </Suspense>
    </>
  );
}
