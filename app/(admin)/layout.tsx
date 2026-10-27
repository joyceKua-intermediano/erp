import { Suspense, type ReactNode } from "react";
import { AdminShell } from "@/components/layout/admin/admin-shell";
import { AdminSidebar } from "@/components/layout/admin/admin-sidebar";
import { AdminUserMenu } from "@/components/layout/admin/admin-user-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";

async function UserMenuSlot() {
  const user = await getSessionUser();
  if (!user) return null;

  const email = user.email ?? "";
  return <AdminUserMenu name={user.name ?? email} email={email} role={user.role} />;
}

async function SidebarSlot() {
  const user = await getSessionUser();
  return <AdminSidebar permissions={user?.permissions ?? []} />;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminShell
      sidebar={
        <Suspense fallback={<AdminSidebar permissions={[]} />}>
          <SidebarSlot />
        </Suspense>
      }
      userMenu={
        <Suspense fallback={<Skeleton className="h-10 w-10 rounded-xl md:w-36" />}>
          <UserMenuSlot />
        </Suspense>
      }
    >
      {children}
    </AdminShell>
  );
}
