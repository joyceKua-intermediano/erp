import type { NextFetchEvent, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { customerAuth } from "@/lib/customer-auth";
import { employeeAuth } from "@/lib/employee-auth";

// Each portal is guarded by its own Auth.js instance; their `authorized` callbacks decide the redirects.
// Typing the event as NextFetchEvent selects Auth.js's middleware overload rather than its route handler one.
const passThrough: (request: NextRequest, event: NextFetchEvent) => undefined = () => undefined;

const adminProxy = auth(passThrough);
const employeeProxy = employeeAuth(passThrough);
const customerProxy = customerAuth(passThrough);

function isEmployeePath(pathname: string) {
  return pathname === "/employee" || pathname.startsWith("/employee/");
}

function isCustomerPath(pathname: string) {
  return pathname === "/customer" || pathname.startsWith("/customer/");
}

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  if (isEmployeePath(pathname)) return employeeProxy(request, event);
  if (isCustomerPath(pathname)) return customerProxy(request, event);
  return adminProxy(request, event);
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/no-access", "/employee/:path*", "/customer/:path*"],
};
