import type { ReactNode } from "react";
import { CustomerShell } from "@/components/layout/customer/customer-shell";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return <CustomerShell>{children}</CustomerShell>;
}
