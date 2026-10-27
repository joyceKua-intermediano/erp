import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { PageHeader } from "@/components/layout/page-header";
import { QuotationsWorkspace } from "@/components/quotations/quotations-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Quotations",
};

async function QuotationsSlot() {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "quotations.view")) {
    return <AccessDenied message="Ask an administrator for access to Quotations." />;
  }

  return <QuotationsWorkspace canManage={hasPermission(user, "quotations.manage")} />;
}

export default function QuotationsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Cluster workspace"
        title="Quotations"
        description="Payroll cost quotes for the cluster selected in the header, with the full cost breakdown."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <QuotationsSlot />
      </Suspense>
    </>
  );
}
