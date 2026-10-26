import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { CompaniesWorkspace } from "@/components/companies/companies-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Companies",
};

async function CompaniesSlot() {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "companies.view")) {
    return <AccessDenied message="Ask an administrator for access to Companies." />;
  }

  return <CompaniesWorkspace canManage={hasPermission(user, "companies.manage")} />;
}

export default function CompaniesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Companies"
        description="The client and prospect companies Intermediano works with, and the people to contact there."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <CompaniesSlot />
      </Suspense>
    </>
  );
}
