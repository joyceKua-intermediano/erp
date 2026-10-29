import { Suspense, type ReactNode } from "react";
import { EmployeeAccount, EmployeeProfileSummary } from "@/components/layout/employee/employee-account";
import { EmployeeShell } from "@/components/layout/employee/employee-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { getEmployeeSessionUser } from "@/lib/employee-auth";

async function AccountSlot() {
  const user = await getEmployeeSessionUser();
  if (!user) return null;

  const email = user.email ?? "";
  return <EmployeeAccount name={user.name ?? email} email={email} />;
}

async function ProfileSlot() {
  const user = await getEmployeeSessionUser();
  if (!user) return null;

  const email = user.email ?? "";
  return <EmployeeProfileSummary name={user.name ?? email} email={email} />;
}

export default function EmployeePortalLayout({ children }: { children: ReactNode }) {
  return (
    <EmployeeShell
      account={
        <Suspense fallback={<Skeleton className="h-8 w-24 rounded-lg" />}>
          <AccountSlot />
        </Suspense>
      }
      profile={
        <Suspense fallback={<Skeleton className="h-10 w-40 rounded-lg" />}>
          <ProfileSlot />
        </Suspense>
      }
    >
      {children}
    </EmployeeShell>
  );
}
