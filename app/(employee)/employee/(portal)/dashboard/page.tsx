import type { Metadata } from "next";
import {
  CalendarClockIcon,
  FolderOpenIcon,
  PalmtreeIcon,
  ReceiptIcon,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Employee hub",
};

const summary = [
  { title: "Latest payslip", hint: "Your most recent payroll period", icon: ReceiptIcon },
  { title: "Hours this month", hint: "Logged in your current timesheet", icon: CalendarClockIcon },
  { title: "Vacation balance", hint: "Days remaining this contract year", icon: PalmtreeIcon },
  { title: "Documents", hint: "Files in your submission folders", icon: FolderOpenIcon },
] as const;

export default function EmployeeDashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Employee hub"
        title="Your summary"
        description="Payslips, timesheets, vacation and documents at a glance."
      />
      <section className="grid gap-4 sm:grid-cols-2" aria-label="Summary">
        {summary.map((item) => (
          <KpiCard key={item.title} title={item.title} value="—" hint={item.hint} icon={item.icon} />
        ))}
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Next steps</CardTitle>
          <CardDescription>Tasks from HR and payroll will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-36 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            You&apos;re all caught up
          </div>
        </CardContent>
      </Card>
    </>
  );
}
