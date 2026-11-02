import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CustomerTimesheetDetail } from "@/components/customer/timesheets/customer-timesheet-detail";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { CUSTOMER_LOGIN_PATH, getCustomerSessionUser } from "@/lib/customer-auth";

export const metadata: Metadata = {
  title: "Timesheet",
};

// The customer shell reads usePathname() outside <Suspense>, which can't be prerendered for a dynamic segment.
export const instant = false;

async function TimesheetSlot({ params }: { params: PageProps<"/customer/timesheets/[timesheetId]">["params"] }) {
  const user = await getCustomerSessionUser();
  if (!user) redirect(CUSTOMER_LOGIN_PATH);

  const { timesheetId } = await params;

  return <CustomerTimesheetDetail timesheetId={timesheetId} />;
}

export default function CustomerTimesheetPage({ params }: PageProps<"/customer/timesheets/[timesheetId]">) {
  return (
    <>
      <PageHeader eyebrow="Client portal" title="Timesheet" />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <TimesheetSlot params={params} />
      </Suspense>
    </>
  );
}
