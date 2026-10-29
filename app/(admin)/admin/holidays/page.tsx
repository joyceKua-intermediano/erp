import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { HolidaysWorkspace } from "@/components/holidays/holidays-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Holidays",
};

async function HolidaysSlot() {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "settings.view")) {
    return <AccessDenied message="Ask an administrator for access to Configuration." />;
  }

  return <HolidaysWorkspace canManage={hasPermission(user, "settings.manage")} />;
}

export default function HolidaysPage() {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Holidays"
        description="Public holidays for each country and year, shared by every cluster in that country."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <HolidaysSlot />
      </Suspense>
    </>
  );
}
