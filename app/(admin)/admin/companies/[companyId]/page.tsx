import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { CompanyDetail } from "@/components/companies/company-detail";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Company",
};

// The admin sidebar reads usePathname() outside <Suspense>, which can't be prerendered for a dynamic segment.
export const instant = false;

async function CompanySlot({ params }: { params: PageProps<"/admin/companies/[companyId]">["params"] }) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "companies.view")) {
    return <AccessDenied message="Ask an administrator for access to Companies." />;
  }

  const { companyId } = await params;

  return (
    <CompanyDetail
      companyId={companyId}
      canManage={hasPermission(user, "companies.manage")}
      canViewContacts={hasPermission(user, "contacts.view")}
      canManageContacts={hasPermission(user, "contacts.manage")}
    />
  );
}

export default function CompanyPage({ params }: PageProps<"/admin/companies/[companyId]">) {
  return (
    <>
      <PageHeader eyebrow="Sales" title="Companies" />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <CompanySlot params={params} />
      </Suspense>
    </>
  );
}
