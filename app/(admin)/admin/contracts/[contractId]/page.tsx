import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { ContractDetailView } from "@/components/contracts/contract-detail";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Contract",
};

// The admin sidebar reads usePathname() outside <Suspense>, which can't be prerendered for a dynamic segment.
export const instant = false;

async function ContractSlot({ params }: { params: PageProps<"/admin/contracts/[contractId]">["params"] }) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "contracts.view")) {
    return <AccessDenied message="Ask an administrator for access to Contracts." />;
  }

  const { contractId } = await params;

  return <ContractDetailView contractId={contractId} canManage={hasPermission(user, "contracts.manage")} />;
}

export default function ContractPage({ params }: PageProps<"/admin/contracts/[contractId]">) {
  return (
    <>
      <PageHeader eyebrow="Cluster workspace" title="Contracts" />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <ContractSlot params={params} />
      </Suspense>
    </>
  );
}
