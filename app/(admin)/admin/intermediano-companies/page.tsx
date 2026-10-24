import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { PageHeader } from "@/components/layout/page-header";
import { CompaniesWorkspace } from "@/components/intermediano-companies/companies-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Intermediano companies",
};

async function CompaniesSlot() {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "intermediano_companies.view")) {
    return <AccessDenied message="Ask an administrator for access to Configuration." />;
  }

  return <CompaniesWorkspace canManage={hasPermission(user, "intermediano_companies.manage")} />;
}

export default function IntermedianoCompaniesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Intermediano companies"
        description="The Intermediano legal entities that employ people. Each one is a cluster in the switcher."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <CompaniesSlot />
      </Suspense>
    </>
  );
}
