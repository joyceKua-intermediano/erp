import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { CustomerAccountsWorkspace } from "@/components/customer-accounts/customer-accounts-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission, recordPermissions } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Portal accounts",
};

async function PortalAccountsSlot() {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "portal_accounts.list")) {
    return <AccessDenied message="Ask an administrator for access to Portal accounts." />;
  }

  return <CustomerAccountsWorkspace can={recordPermissions(user, "portal_accounts")} />;
}

export default function PortalAccountsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <PortalAccountsSlot />
    </Suspense>
  );
}
