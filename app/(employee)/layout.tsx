import type { ReactNode } from "react";
import { EmployeeShell } from "@/components/layout/employee/employee-shell";

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return <EmployeeShell>{children}</EmployeeShell>;
}
