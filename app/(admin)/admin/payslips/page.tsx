import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { PageHeader } from "@/components/layout/page-header";
import { PayslipWorkspace } from "@/components/payslips/payslip-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission, recordPermissions } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Payslips",
};

async function PayslipsSlot() {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "payslips.list")) {
    return <AccessDenied message="Ask an administrator for access to Payslips." />;
  }

  return <PayslipWorkspace can={recordPermissions(user, "payslips")} canDownload={hasPermission(user, "payslips.show")} />;
}

export default function PayslipsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Cluster workspace"
        title="Payslips"
        description="Payslip PDFs for employees in the cluster selected in the header. Employees see theirs in the Employee hub."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <PayslipsSlot />
      </Suspense>
    </>
  );
}
