import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CustomerExpenseList } from "@/components/customer/expenses/customer-expense-list";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { CUSTOMER_LOGIN_PATH, getCustomerSessionUser } from "@/lib/customer-auth";

export const metadata: Metadata = {
  title: "Expenses",
};

async function ExpensesSlot() {
  const user = await getCustomerSessionUser();
  if (!user) redirect(CUSTOMER_LOGIN_PATH);

  return <CustomerExpenseList />;
}

export default function CustomerExpensesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Client portal"
        title="Expenses"
        description="Review the expenses your team submits for reimbursement."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <ExpensesSlot />
      </Suspense>
    </>
  );
}
