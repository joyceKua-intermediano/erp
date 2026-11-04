import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MyDocumentsEditor } from "@/components/employee/documents/my-documents-form";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EMPLOYEE_LOGIN_PATH, getEmployeeSessionUser } from "@/lib/employee-auth";

export const metadata: Metadata = {
  title: "Documents",
};

async function DocumentsSlot() {
  const user = await getEmployeeSessionUser();
  if (!user) redirect(EMPLOYEE_LOGIN_PATH);

  return <MyDocumentsEditor />;
}

export default function MyDocumentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Employee hub"
        title="Documents"
        description="Your identification, banking details, social security numbers and document copies."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <DocumentsSlot />
      </Suspense>
    </>
  );
}
