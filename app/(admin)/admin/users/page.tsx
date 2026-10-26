import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { UsersWorkspace } from "@/components/access/users-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Users",
};

async function UsersSlot() {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "users.view")) {
    return <AccessDenied message="Ask an administrator for access to Users & roles." />;
  }

  return <UsersWorkspace canManage={hasPermission(user, "users.manage")} currentUserId={user.id} />;
}

export default function UsersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <UsersSlot />
    </Suspense>
  );
}
