import { Suspense, type ReactNode } from "react";
import { CustomerAccount } from "@/components/layout/customer/customer-account";
import { CustomerShell } from "@/components/layout/customer/customer-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { getCustomerSessionUser } from "@/lib/customer-auth";

async function AccountSlot() {
  const user = await getCustomerSessionUser();
  if (!user) return null;

  const email = user.email ?? "";
  return <CustomerAccount name={user.name ?? email} email={email} />;
}

export default function CustomerPortalLayout({ children }: { children: ReactNode }) {
  return (
    <CustomerShell
      account={
        <Suspense fallback={<Skeleton className="h-8 w-24 rounded-lg" />}>
          <AccountSlot />
        </Suspense>
      }
    >
      {children}
    </CustomerShell>
  );
}
