import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { RoleEditor } from "@/components/access/role-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Role",
};

// The admin sidebar reads usePathname() outside <Suspense>, which can't be prerendered for a dynamic segment.
export const instant = false;

async function RoleSlot({ params }: { params: PageProps<"/admin/users/roles/[roleId]">["params"] }) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "users.view")) {
    return <AccessDenied message="Ask an administrator for access to Users & roles." />;
  }

  const { roleId } = await params;

  return (
    <RoleEditor
      roleId={roleId}
      copyFromId={null}
      canManage={hasPermission(user, "users.manage")}
      currentRoleName={user.role}
    />
  );
}

export default function RolePage({ params }: PageProps<"/admin/users/roles/[roleId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[32rem] rounded-xl" />}>
      <RoleSlot params={params} />
    </Suspense>
  );
}
