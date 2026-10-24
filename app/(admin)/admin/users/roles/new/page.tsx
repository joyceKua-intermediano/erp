import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { RoleEditor } from "@/components/access/role-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "New role",
};

async function NewRoleSlot({ searchParams }: { searchParams: PageProps<"/admin/users/roles/new">["searchParams"] }) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "users.manage")) {
    return <AccessDenied message="Only people who can manage Users & roles can create roles." />;
  }

  const { from } = await searchParams;
  const copyFromId = typeof from === "string" && /^\d+$/.test(from) ? from : null;

  return <RoleEditor roleId={null} copyFromId={copyFromId} canManage currentRoleName={user.role} />;
}

export default function NewRolePage({ searchParams }: PageProps<"/admin/users/roles/new">) {
  return (
    <Suspense fallback={<Skeleton className="h-[32rem] rounded-xl" />}>
      <NewRoleSlot searchParams={searchParams} />
    </Suspense>
  );
}
