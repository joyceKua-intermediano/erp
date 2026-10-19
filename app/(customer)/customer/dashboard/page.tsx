import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarClockIcon,
  FileSignatureIcon,
  PalmtreeIcon,
  ReceiptTextIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Client portal",
};

const shortcuts = [
  {
    title: "Contracts",
    description: "Review and sign service agreements for your placed staff.",
    href: "/customer/contracts",
    icon: FileSignatureIcon,
  },
  {
    title: "Invoices",
    description: "Download invoices and check payment status.",
    href: "/customer/invoices",
    icon: ReceiptTextIcon,
  },
  {
    title: "Timesheets",
    description: "Approve monthly hours submitted by your team.",
    href: "/customer/timesheets",
    icon: CalendarClockIcon,
  },
  {
    title: "Vacations",
    description: "Respond to vacation requests from your staff.",
    href: "/customer/vacations",
    icon: PalmtreeIcon,
  },
] as const;

export default function CustomerDashboardPage() {
  return (
    <>
      <Card className="bg-linear-to-br from-primary to-primary/80 text-primary-foreground ring-0 [--card-spacing:--spacing(8)]">
        <CardContent className="flex flex-col gap-2">
          <span className="text-xs font-medium tracking-wider uppercase opacity-80">Client portal</span>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Welcome back</h1>
          <p className="max-w-xl text-sm opacity-80">
            Everything about the team Intermediano manages for you, from contracts and invoices to
            timesheet and vacation approvals, in one place.
          </p>
        </CardContent>
      </Card>
      <h2 className="font-heading text-lg font-semibold tracking-tight">Where would you like to start?</h2>
      <section className="grid gap-4 sm:grid-cols-2" aria-label="Shortcuts">
        {shortcuts.map((shortcut) => (
          <Link key={shortcut.href} href={shortcut.href} className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Card className="h-full transition-shadow group-hover:shadow-md [--card-spacing:--spacing(6)]">
              <CardHeader>
                <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted">
                  <shortcut.icon className="size-5" />
                </span>
                <CardTitle className="flex items-center gap-2">
                  {shortcut.title}
                  <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardTitle>
                <CardDescription>{shortcut.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>
    </>
  );
}
