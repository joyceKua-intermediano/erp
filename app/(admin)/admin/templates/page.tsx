import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { PageHeader } from "@/components/layout/page-header";
import { TemplatesWorkspace } from "@/components/templates/templates-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission, recordPermissions } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Contract templates",
};

async function TemplatesSlot() {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "templates.list")) {
    return <AccessDenied message="Ask an administrator for access to Contract templates." />;
  }

  return <TemplatesWorkspace can={recordPermissions(user, "templates")} />;
}

export default function TemplatesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Contract templates"
        description="The Typst documents used to generate contract PDFs for each cluster."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <TemplatesSlot />
      </Suspense>
    </>
  );
}
