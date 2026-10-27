import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { PageHeader } from "@/components/layout/page-header";
import { QuotationDetailView } from "@/components/quotations/quotation-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Quotation",
};

// The admin sidebar reads usePathname() outside <Suspense>, which can't be prerendered for a dynamic segment.
export const instant = false;

async function QuotationSlot({ params }: { params: PageProps<"/admin/quotations/[quotationId]">["params"] }) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "quotations.view")) {
    return <AccessDenied message="Ask an administrator for access to Quotations." />;
  }

  const { quotationId } = await params;

  return <QuotationDetailView quotationId={quotationId} canManage={hasPermission(user, "quotations.manage")} />;
}

export default function QuotationPage({ params }: PageProps<"/admin/quotations/[quotationId]">) {
  return (
    <>
      <PageHeader eyebrow="Cluster workspace" title="Quotations" />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <QuotationSlot params={params} />
      </Suspense>
    </>
  );
}
