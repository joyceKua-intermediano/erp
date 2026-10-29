import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MyTimesheetEditor } from "@/components/employee/timesheets/my-timesheet-form";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EMPLOYEE_LOGIN_PATH, getEmployeeSessionUser } from "@/lib/employee-auth";

export const metadata: Metadata = {
  title: "New timesheet",
};

async function NewTimesheetSlot() {
  const user = await getEmployeeSessionUser();
  if (!user) redirect(EMPLOYEE_LOGIN_PATH);

  return <MyTimesheetEditor timesheetId={null} />;
}

export default function NewTimesheetPage() {
  return (
    <>
      <PageHeader eyebrow="Employee hub" title="New timesheet" />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <NewTimesheetSlot />
      </Suspense>
    </>
  );
}
