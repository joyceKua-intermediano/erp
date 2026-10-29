import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { VacationWorkspace } from "@/components/vacations/vacation-workspace";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Vacations",
};

async function VacationsSlot() {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "employees.view")) {
    return <AccessDenied message="Ask an administrator for access to Employees." />;
  }

  return <VacationWorkspace canManage={hasPermission(user, "employees.manage")} />;
}

export default function VacationsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Cluster workspace"
        title="Vacations"
        description="Time off requested by employees in the cluster selected in the header, ready to approve or reject."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <VacationsSlot />
      </Suspense>
    </>
  );
}
