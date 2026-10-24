import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { ConsultantsWorkspace } from "@/components/consultants/consultants-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Consultants",
};

async function ConsultantsSlot() {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "consultants.view")) {
    return <AccessDenied message="Ask an administrator for access to Consultants." />;
  }

  return <ConsultantsWorkspace canManage={hasPermission(user, "consultants.manage")} />;
}

export default function ConsultantsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Recruitment"
        title="Consultants"
        description="Recruitment consultants that employees can be assigned to, grouped by country."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <ConsultantsSlot />
      </Suspense>
    </>
  );
}
