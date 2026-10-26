import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { PageHeader } from "@/components/layout/page-header";
import { TemplateEditor } from "@/components/templates/template-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Contract template",
};

// The admin sidebar reads usePathname() outside <Suspense>, which can't be prerendered for a dynamic segment.
export const instant = false;

async function TemplateSlot({ params }: { params: PageProps<"/admin/templates/[templateId]">["params"] }) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "settings.view")) {
    return <AccessDenied message="Ask an administrator for access to Configuration." />;
  }

  const { templateId } = await params;

  return <TemplateEditor templateId={templateId} canManage={hasPermission(user, "settings.manage")} />;
}

export default function TemplatePage({ params }: PageProps<"/admin/templates/[templateId]">) {
  return (
    <>
      <PageHeader eyebrow="Settings" title="Contract templates" />
      <Suspense fallback={<Skeleton className="h-[40rem] rounded-xl" />}>
        <TemplateSlot params={params} />
      </Suspense>
    </>
  );
}
