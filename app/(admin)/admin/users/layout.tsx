import { AccessTabs } from "@/components/access/access-tabs";
import { PageHeader } from "@/components/layout/page-header";

export default function UsersLayout({ children }: LayoutProps<"/admin/users">) {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Users & roles"
        description="Who can sign in to the admin console, and what each role is allowed to see and change."
      />
      <div className="flex flex-col gap-6">
        <AccessTabs />
        {children}
      </div>
    </>
  );
}
