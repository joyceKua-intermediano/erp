import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { ExpenseClaimDetailView } from "@/components/expenses/expense-claim-detail";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Expenses",
};

// The admin sidebar reads usePathname() outside <Suspense>, which can't be prerendered for a dynamic segment.
export const instant = false;

async function ExpenseDetailSlot({ params }: { params: PageProps<"/admin/expenses/[expenseId]">["params"] }) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "expenses.show")) {
    return <AccessDenied message="Ask an administrator for access to Expenses." />;
  }

  const { expenseId } = await params;

  return <ExpenseClaimDetailView expenseId={expenseId} canManage={hasPermission(user, "expenses.edit")} />;
}

export default function ExpenseDetailPage({ params }: PageProps<"/admin/expenses/[expenseId]">) {
  return (
    <>
      <PageHeader eyebrow="Cluster workspace" title="Expenses" />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <ExpenseDetailSlot params={params} />
      </Suspense>
    </>
  );
}
