import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { ContractsWorkspace } from "@/components/contracts/contracts-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Contracts",
};

async function ContractsSlot() {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "contracts.view")) {
    return <AccessDenied message="Ask an administrator for access to Contracts." />;
  }

  return <ContractsWorkspace canManage={hasPermission(user, "contracts.manage")} />;
}

export default function ContractsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Cluster workspace"
        title="Contracts"
        description="Every contract signed under the cluster selected in the header."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <ContractsSlot />
      </Suspense>
    </>
  );
}
