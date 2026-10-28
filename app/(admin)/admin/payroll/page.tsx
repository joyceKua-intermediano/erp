import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { PageHeader } from "@/components/layout/page-header";
import { PayrollWorkspace } from "@/components/payroll/payroll-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Payroll",
};

async function PayrollSlot() {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "payroll.view")) {
    return <AccessDenied message="Ask an administrator for access to Payroll." />;
  }

  return <PayrollWorkspace canManage={hasPermission(user, "payroll.manage")} />;
}

export default function PayrollPage() {
  return (
    <>
      <PageHeader
        eyebrow="Cluster workspace"
        title="Payroll"
        description="Monthly payroll runs for the cluster selected in the header, with paid and accrued provisions."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <PayrollSlot />
      </Suspense>
    </>
  );
}
