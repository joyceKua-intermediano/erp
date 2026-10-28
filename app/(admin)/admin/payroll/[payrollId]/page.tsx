import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { PageHeader } from "@/components/layout/page-header";
import { PayrollDetailView } from "@/components/payroll/payroll-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Payroll",
};

// The admin sidebar reads usePathname() outside <Suspense>, which can't be prerendered for a dynamic segment.
export const instant = false;

async function PayrollDetailSlot({ params }: { params: PageProps<"/admin/payroll/[payrollId]">["params"] }) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "payroll.view")) {
    return <AccessDenied message="Ask an administrator for access to Payroll." />;
  }

  const { payrollId } = await params;

  return <PayrollDetailView payrollId={payrollId} canManage={hasPermission(user, "payroll.manage")} />;
}

export default function PayrollDetailPage({ params }: PageProps<"/admin/payroll/[payrollId]">) {
  return (
    <>
      <PageHeader eyebrow="Cluster workspace" title="Payroll" />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <PayrollDetailSlot params={params} />
      </Suspense>
    </>
  );
}
