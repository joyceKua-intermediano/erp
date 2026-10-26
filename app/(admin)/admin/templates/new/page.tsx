import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { PageHeader } from "@/components/layout/page-header";
import { TemplateEditor } from "@/components/templates/template-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "New contract template",
};

async function NewTemplateSlot() {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "settings.manage")) {
    return <AccessDenied message="Only people who can manage Configuration can create contract templates." />;
  }

  return <TemplateEditor templateId={null} canManage />;
}

export default function NewTemplatePage() {
  return (
    <>
      <PageHeader eyebrow="Settings" title="Contract templates" />
      <Suspense fallback={<Skeleton className="h-[40rem] rounded-xl" />}>
        <NewTemplateSlot />
      </Suspense>
    </>
  );
}
