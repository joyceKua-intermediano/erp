import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MyTimesheetList } from "@/components/employee/timesheets/my-timesheet-list";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EMPLOYEE_LOGIN_PATH, getEmployeeSessionUser } from "@/lib/employee-auth";

export const metadata: Metadata = {
  title: "Timesheets",
};

async function TimesheetsSlot() {
  const user = await getEmployeeSessionUser();
  if (!user) redirect(EMPLOYEE_LOGIN_PATH);

  return <MyTimesheetList />;
}

export default function MyTimesheetsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Employee hub"
        title="Timesheets"
        description="Log the hours you work each month and follow their review."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <TimesheetsSlot />
      </Suspense>
    </>
  );
}
