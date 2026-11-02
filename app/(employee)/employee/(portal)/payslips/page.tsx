import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MyPayslipList } from "@/components/employee/payslips/my-payslip-list";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EMPLOYEE_LOGIN_PATH, getEmployeeSessionUser } from "@/lib/employee-auth";

export const metadata: Metadata = {
  title: "Payslips",
};

async function PayslipsSlot() {
  const user = await getEmployeeSessionUser();
  if (!user) redirect(EMPLOYEE_LOGIN_PATH);

  return <MyPayslipList />;
}

export default function MyPayslipsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Employee hub"
        title="Payslips"
        description="Open or download the payslips HR has issued to you."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <PayslipsSlot />
      </Suspense>
    </>
  );
}
