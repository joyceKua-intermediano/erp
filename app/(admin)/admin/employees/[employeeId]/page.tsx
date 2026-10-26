import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { EmployeeDetailView } from "@/components/employees/employee-detail";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Employee",
};

// The admin sidebar reads usePathname() outside <Suspense>, which can't be prerendered for a dynamic segment.
export const instant = false;

async function EmployeeSlot({ params }: { params: PageProps<"/admin/employees/[employeeId]">["params"] }) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "employees.view")) {
    return <AccessDenied message="Ask an administrator for access to Employees." />;
  }

  const { employeeId } = await params;

  return <EmployeeDetailView employeeId={employeeId} canManage={hasPermission(user, "employees.manage")} />;
}

export default function EmployeePage({ params }: PageProps<"/admin/employees/[employeeId]">) {
  return (
    <>
      <PageHeader eyebrow="Cluster workspace" title="Employees" />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <EmployeeSlot params={params} />
      </Suspense>
    </>
  );
}
