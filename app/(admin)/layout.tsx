import { Suspense, type ReactNode } from "react";
import { AdminShell } from "@/components/layout/admin/admin-shell";
import { AdminUserMenu } from "@/components/layout/admin/admin-user-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";

async function UserMenuSlot() {
  const user = await getSessionUser();
  if (!user) return null;

  const email = user.email ?? "";
  return <AdminUserMenu name={user.name ?? email} email={email} role={user.role} />;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminShell
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
