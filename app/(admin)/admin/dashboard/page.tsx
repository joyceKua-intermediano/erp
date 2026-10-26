import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRightIcon } from "lucide-react";
import { AccessDenied } from "@/components/access-denied";
import { EmployeeSummary } from "@/components/employees/employee-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Admin dashboard",
};

async function EmployeesSlot() {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "employees.view")) {
    return <AccessDenied message="Ask an administrator for access to Employees." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <EmployeeSummary />
      <Link
        href="/admin/employees"
        className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit" })}
      >
        View all employees
        <ArrowRightIcon />
      </Link>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admin console"
        title="Workforce overview"
        description="Employee and contract totals for the cluster selected in the header."
      />
      <Suspense fallback={<Skeleton className="h-28 rounded-xl" />}>
        <EmployeesSlot />
      </Suspense>
    </>
  );
}
