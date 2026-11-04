import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { RolesWorkspace } from "@/components/access/roles-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission, recordPermissions } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Roles",
};

async function RolesSlot() {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "users.list")) {
    return <AccessDenied message="Ask an administrator for access to Users & roles." />;
  }

  return <RolesWorkspace can={recordPermissions(user, "users")} />;
}

export default function RolesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
      <RolesSlot />
    </Suspense>
  );
}
