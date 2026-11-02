import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MyExpenseEditor } from "@/components/employee/expenses/my-expense-form";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EMPLOYEE_LOGIN_PATH, getEmployeeSessionUser } from "@/lib/employee-auth";

export const metadata: Metadata = {
  title: "New expense claim",
};

async function NewExpenseSlot() {
  const user = await getEmployeeSessionUser();
  if (!user) redirect(EMPLOYEE_LOGIN_PATH);

  return <MyExpenseEditor expenseId={null} />;
}

export default function NewExpensePage() {
  return (
    <>
      <PageHeader eyebrow="Employee hub" title="New expense claim" />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <NewExpenseSlot />
      </Suspense>
    </>
  );
}
