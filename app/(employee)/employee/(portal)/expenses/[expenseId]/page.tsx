import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MyExpenseEditor } from "@/components/employee/expenses/my-expense-form";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EMPLOYEE_LOGIN_PATH, getEmployeeSessionUser } from "@/lib/employee-auth";

export const metadata: Metadata = {
  title: "Expense claim",
};

// The employee shell reads usePathname() outside <Suspense>, which can't be prerendered for a dynamic segment.
export const instant = false;

async function ExpenseSlot({ params }: { params: PageProps<"/employee/expenses/[expenseId]">["params"] }) {
  const user = await getEmployeeSessionUser();
  if (!user) redirect(EMPLOYEE_LOGIN_PATH);

  const { expenseId } = await params;

  return <MyExpenseEditor expenseId={expenseId} />;
}

export default function MyExpensePage({ params }: PageProps<"/employee/expenses/[expenseId]">) {
  return (
    <>
      <PageHeader eyebrow="Employee hub" title="Expense claim" />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <ExpenseSlot params={params} />
      </Suspense>
    </>
  );
}
