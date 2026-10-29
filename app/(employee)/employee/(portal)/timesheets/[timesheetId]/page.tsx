import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MyTimesheetEditor } from "@/components/employee/timesheets/my-timesheet-form";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EMPLOYEE_LOGIN_PATH, getEmployeeSessionUser } from "@/lib/employee-auth";

export const metadata: Metadata = {
  title: "Timesheet",
};

// The employee shell reads usePathname() outside <Suspense>, which can't be prerendered for a dynamic segment.
export const instant = false;

async function TimesheetSlot({ params }: { params: PageProps<"/employee/timesheets/[timesheetId]">["params"] }) {
  const user = await getEmployeeSessionUser();
  if (!user) redirect(EMPLOYEE_LOGIN_PATH);

  const { timesheetId } = await params;

  return <MyTimesheetEditor timesheetId={timesheetId} />;
}

export default function MyTimesheetPage({ params }: PageProps<"/employee/timesheets/[timesheetId]">) {
  return (
    <>
      <PageHeader eyebrow="Employee hub" title="Timesheet" />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <TimesheetSlot params={params} />
      </Suspense>
    </>
  );
}
