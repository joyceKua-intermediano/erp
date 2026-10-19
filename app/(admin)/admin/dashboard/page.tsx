import type { Metadata } from "next";
import { EmployeeWorkspace } from "@/components/employees/employee-workspace";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Admin dashboard",
};

export default function AdminDashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admin console"
        title="Workforce overview"
        description="Employees, positions and contract status for the cluster selected in the header."
      />
      <EmployeeWorkspace />
    </>
  );
}
