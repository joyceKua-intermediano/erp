import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MyProfileEditor } from "@/components/employee/profile/my-profile-form";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EMPLOYEE_LOGIN_PATH, getEmployeeSessionUser } from "@/lib/employee-auth";

export const metadata: Metadata = {
  title: "Profile",
};

async function ProfileSlot() {
  const user = await getEmployeeSessionUser();
  if (!user) redirect(EMPLOYEE_LOGIN_PATH);

  return <MyProfileEditor />;
}

export default function MyProfilePage() {
  return (
    <>
      <PageHeader
        eyebrow="Employee hub"
        title="Profile"
        description="Your personal details, dependents and emergency contact."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <ProfileSlot />
      </Suspense>
    </>
  );
}
