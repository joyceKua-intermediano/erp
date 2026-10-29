import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MyVacationList } from "@/components/employee/vacations/my-vacation-list";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EMPLOYEE_LOGIN_PATH, getEmployeeSessionUser } from "@/lib/employee-auth";

export const metadata: Metadata = {
  title: "Vacations",
};

async function VacationsSlot() {
  const user = await getEmployeeSessionUser();
  if (!user) redirect(EMPLOYEE_LOGIN_PATH);

  return <MyVacationList />;
}

export default function MyVacationsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Employee hub"
        title="Vacations"
        description="Your accrued vacation balance, your requests and their review."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <VacationsSlot />
      </Suspense>
    </>
  );
}
