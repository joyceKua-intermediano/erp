import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CustomerExpenseDetail } from "@/components/customer/expenses/customer-expense-detail";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { CUSTOMER_LOGIN_PATH, getCustomerSessionUser } from "@/lib/customer-auth";

export const metadata: Metadata = {
  title: "Expense claim",
};

// The customer shell reads usePathname() outside <Suspense>, which can't be prerendered for a dynamic segment.
export const instant = false;

async function ExpenseSlot({ params }: { params: PageProps<"/customer/expenses/[expenseId]">["params"] }) {
  const user = await getCustomerSessionUser();
  if (!user) redirect(CUSTOMER_LOGIN_PATH);

  const { expenseId } = await params;

  return <CustomerExpenseDetail expenseId={expenseId} />;
}

export default function CustomerExpensePage({ params }: PageProps<"/customer/expenses/[expenseId]">) {
  return (
    <>
      <PageHeader eyebrow="Client portal" title="Expense claim" />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <ExpenseSlot params={params} />
      </Suspense>
    </>
  );
}
