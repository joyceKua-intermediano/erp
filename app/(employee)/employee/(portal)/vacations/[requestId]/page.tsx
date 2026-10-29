import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MyVacationEditor } from "@/components/employee/vacations/my-vacation-form";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EMPLOYEE_LOGIN_PATH, getEmployeeSessionUser } from "@/lib/employee-auth";

export const metadata: Metadata = {
  title: "Vacation request",
};

// The employee shell reads usePathname() outside <Suspense>, which can't be prerendered for a dynamic segment.
export const instant = false;

async function VacationSlot({ params }: { params: PageProps<"/employee/vacations/[requestId]">["params"] }) {
  const user = await getEmployeeSessionUser();
  if (!user) redirect(EMPLOYEE_LOGIN_PATH);

  const { requestId } = await params;

  return <MyVacationEditor requestId={requestId} />;
}

export default function MyVacationPage({ params }: PageProps<"/employee/vacations/[requestId]">) {
  return (
    <>
      <PageHeader eyebrow="Employee hub" title="Vacation request" />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <VacationSlot params={params} />
      </Suspense>
    </>
  );
}
