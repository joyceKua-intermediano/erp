import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { PageHeader } from "@/components/layout/page-header";
import { TimesheetDetailView } from "@/components/timesheets/timesheet-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Timesheets",
};

// The admin sidebar reads usePathname() outside <Suspense>, which can't be prerendered for a dynamic segment.
export const instant = false;

async function TimesheetDetailSlot({ params }: { params: PageProps<"/admin/timesheets/[timesheetId]">["params"] }) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "timesheets.view")) {
    return <AccessDenied message="Ask an administrator for access to Timesheets." />;
  }

  const { timesheetId } = await params;

  return <TimesheetDetailView timesheetId={timesheetId} canManage={hasPermission(user, "timesheets.manage")} />;
}

export default function TimesheetDetailPage({ params }: PageProps<"/admin/timesheets/[timesheetId]">) {
  return (
    <>
      <PageHeader eyebrow="Cluster workspace" title="Timesheets" />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <TimesheetDetailSlot params={params} />
      </Suspense>
    </>
  );
}
