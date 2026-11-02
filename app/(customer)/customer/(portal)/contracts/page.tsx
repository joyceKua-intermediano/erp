import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CustomerContractList } from "@/components/customer/contracts/customer-contract-list";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { CUSTOMER_LOGIN_PATH, getCustomerSessionUser } from "@/lib/customer-auth";

export const metadata: Metadata = {
  title: "Contracts",
};

async function ContractsSlot() {
  const user = await getCustomerSessionUser();
  if (!user) redirect(CUSTOMER_LOGIN_PATH);

  return <CustomerContractList />;
}

export default function CustomerContractsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Client portal"
        title="Contracts"
        description="Your service agreements with Intermediano and the contracts of the staff placed with you."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <ContractsSlot />
      </Suspense>
    </>
  );
}
