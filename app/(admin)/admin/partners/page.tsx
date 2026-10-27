import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { PageHeader } from "@/components/layout/page-header";
import { PartnersWorkspace } from "@/components/partners/partners-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Partners",
};

async function PartnersSlot() {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "partners.view")) {
    return <AccessDenied message="Ask an administrator for access to Partners." />;
  }

  return <PartnersWorkspace canManage={hasPermission(user, "partners.manage")} />;
}

export default function PartnersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Partners"
        description="Commercial and operational partners that contracts and portal accounts can be linked to."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <PartnersSlot />
      </Suspense>
    </>
  );
}
