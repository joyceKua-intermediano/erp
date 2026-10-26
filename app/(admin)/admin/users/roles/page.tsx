import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { RolesWorkspace } from "@/components/access/roles-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Roles",
};

async function RolesSlot() {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "users.view")) {
    return <AccessDenied message="Ask an administrator for access to Users & roles." />;
  }

  return <RolesWorkspace canManage={hasPermission(user, "users.manage")} />;
}

export default function RolesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
      <RolesSlot />
    </Suspense>
  );
}
