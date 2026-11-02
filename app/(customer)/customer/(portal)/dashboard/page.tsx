import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CustomerOverview } from "@/components/customer/customer-overview";
import { Skeleton } from "@/components/ui/skeleton";
import { CUSTOMER_LOGIN_PATH, getCustomerSessionUser } from "@/lib/customer-auth";

export const metadata: Metadata = {
  title: "Client portal",
};

async function OverviewSlot() {
  const user = await getCustomerSessionUser();
  if (!user) redirect(CUSTOMER_LOGIN_PATH);

  return <CustomerOverview />;
}

export default function CustomerDashboardPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <OverviewSlot />
    </Suspense>
  );
}
