import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CustomerVacationList } from "@/components/customer/vacations/customer-vacation-list";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { CUSTOMER_LOGIN_PATH, getCustomerSessionUser } from "@/lib/customer-auth";

export const metadata: Metadata = {
  title: "Vacations",
};

async function VacationsSlot() {
  const user = await getCustomerSessionUser();
  if (!user) redirect(CUSTOMER_LOGIN_PATH);

  return <CustomerVacationList />;
}

export default function CustomerVacationsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Client portal"
        title="Vacations"
        description="Approve or reject the time off your team requests."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <VacationsSlot />
      </Suspense>
    </>
  );
}
