import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { EmployeeWorkspace } from "@/components/employees/employee-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Employees",
};

async function EmployeesSlot() {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "employees.view")) {
    return <AccessDenied message="Ask an administrator for access to Employees." />;
  }

  return <EmployeeWorkspace canManage={hasPermission(user, "employees.manage")} />;
}

export default function EmployeesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Cluster workspace"
        title="Employees"
        description="Everyone employed by the cluster selected in the header."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <EmployeesSlot />
      </Suspense>
    </>
  );
}
