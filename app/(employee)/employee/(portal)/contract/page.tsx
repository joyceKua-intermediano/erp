import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MyContractList } from "@/components/employee/contracts/my-contract-list";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EMPLOYEE_LOGIN_PATH, getEmployeeSessionUser } from "@/lib/employee-auth";

export const metadata: Metadata = {
  title: "Contract",
};

async function ContractSlot() {
  const user = await getEmployeeSessionUser();
  if (!user) redirect(EMPLOYEE_LOGIN_PATH);

  return <MyContractList />;
}

export default function MyContractPage() {
  return (
    <>
      <PageHeader
        eyebrow="Employee hub"
        title="Contract"
        description="Open or download the contracts Intermediano has sent you."
      />
      <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
        <ContractSlot />
      </Suspense>
    </>
  );
}
