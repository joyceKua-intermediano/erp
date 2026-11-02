import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MyExpenseList } from "@/components/employee/expenses/my-expense-list";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EMPLOYEE_LOGIN_PATH, getEmployeeSessionUser } from "@/lib/employee-auth";

export const metadata: Metadata = {
  title: "Expenses",
};

async function ExpensesSlot() {
  const user = await getEmployeeSessionUser();
  if (!user) redirect(EMPLOYEE_LOGIN_PATH);

  return <MyExpenseList />;
}

export default function MyExpensesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Employee hub"
        title="Expenses"
        description="Claim work expenses with their receipts and follow each item's review."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <ExpensesSlot />
      </Suspense>
    </>
  );
}
