import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { PageHeader } from "@/components/layout/page-header";
import { CompanyDetail } from "@/components/intermediano-companies/company-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Intermediano company",
};

// The admin sidebar reads usePathname() outside <Suspense>, which can't be prerendered for a dynamic segment.
export const instant = false;

async function CompanySlot({ params }: { params: PageProps<"/admin/intermediano-companies/[companyId]">["params"] }) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "intermediano_companies.view")) {
    return <AccessDenied message="Ask an administrator for access to Configuration." />;
  }

  const { companyId } = await params;

  return <CompanyDetail companyId={companyId} canManage={hasPermission(user, "intermediano_companies.manage")} />;
}

export default function IntermedianoCompanyPage({ params }: PageProps<"/admin/intermediano-companies/[companyId]">) {
  return (
    <>
      <PageHeader eyebrow="Settings" title="Intermediano companies" />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <CompanySlot params={params} />
      </Suspense>
    </>
  );
}
