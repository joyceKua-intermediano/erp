import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { PageHeader } from "@/components/layout/page-header";
import { TimesheetWorkspace } from "@/components/timesheets/timesheet-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Timesheets",
};

async function TimesheetsSlot() {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "timesheets.view")) {
    return <AccessDenied message="Ask an administrator for access to Timesheets." />;
  }

  return <TimesheetWorkspace />;
}

export default function TimesheetsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Cluster workspace"
        title="Timesheets"
        description="Monthly hours submitted by employees in the cluster selected in the header, ready to review and export."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <TimesheetsSlot />
      </Suspense>
    </>
  );
}
