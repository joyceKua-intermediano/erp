import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CustomerTimesheetList } from "@/components/customer/timesheets/customer-timesheet-list";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { CUSTOMER_LOGIN_PATH, getCustomerSessionUser } from "@/lib/customer-auth";

export const metadata: Metadata = {
  title: "Timesheets",
};

async function TimesheetsSlot() {
  const user = await getCustomerSessionUser();
  if (!user) redirect(CUSTOMER_LOGIN_PATH);

  return <CustomerTimesheetList />;
}

export default function CustomerTimesheetsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Client portal"
        title="Timesheets"
        description="Approve or reject the monthly hours your team submits."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <TimesheetsSlot />
      </Suspense>
    </>
  );
}
