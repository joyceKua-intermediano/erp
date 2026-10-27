import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { PageHeader } from "@/components/layout/page-header";
import { PartnerDetail } from "@/components/partners/partner-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Partner",
};

// The admin sidebar reads usePathname() outside <Suspense>, which can't be prerendered for a dynamic segment.
export const instant = false;

async function PartnerSlot({ params }: { params: PageProps<"/admin/partners/[partnerId]">["params"] }) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "partners.view")) {
    return <AccessDenied message="Ask an administrator for access to Partners." />;
  }

  const { partnerId } = await params;

  return <PartnerDetail partnerId={partnerId} canManage={hasPermission(user, "partners.manage")} />;
}

export default function PartnerPage({ params }: PageProps<"/admin/partners/[partnerId]">) {
  return (
    <>
      <PageHeader eyebrow="Sales" title="Partners" />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <PartnerSlot params={params} />
      </Suspense>
    </>
  );
}
