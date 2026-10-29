import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MyVacationEditor } from "@/components/employee/vacations/my-vacation-form";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EMPLOYEE_LOGIN_PATH, getEmployeeSessionUser } from "@/lib/employee-auth";

export const metadata: Metadata = {
  title: "New vacation request",
};

async function NewVacationSlot() {
  const user = await getEmployeeSessionUser();
  if (!user) redirect(EMPLOYEE_LOGIN_PATH);

  return <MyVacationEditor requestId={null} />;
}

export default function NewVacationPage() {
  return (
    <>
      <PageHeader eyebrow="Employee hub" title="New vacation request" />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <NewVacationSlot />
      </Suspense>
    </>
  );
}
