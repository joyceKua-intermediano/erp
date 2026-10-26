import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { ConsultantDetail } from "@/components/consultants/consultant-detail";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Consultant",
};

// The admin sidebar reads usePathname() outside <Suspense>, which can't be prerendered for a dynamic segment.
export const instant = false;

async function ConsultantSlot({ params }: { params: PageProps<"/admin/consultants/[consultantId]">["params"] }) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "consultants.view")) {
    return <AccessDenied message="Ask an administrator for access to Consultants." />;
  }

  const { consultantId } = await params;

  return <ConsultantDetail consultantId={consultantId} canManage={hasPermission(user, "consultants.manage")} />;
}

export default function ConsultantPage({ params }: PageProps<"/admin/consultants/[consultantId]">) {
  return (
    <>
      <PageHeader eyebrow="Recruitment" title="Consultants" />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <ConsultantSlot params={params} />
      </Suspense>
    </>
  );
}
