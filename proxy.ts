import type { NextFetchEvent, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { employeeAuth } from "@/lib/employee-auth";

// Each portal is guarded by its own Auth.js instance; their `authorized` callbacks decide the redirects.
// Typing the event as NextFetchEvent selects Auth.js's middleware overload rather than its route handler one.
const passThrough: (request: NextRequest, event: NextFetchEvent) => undefined = () => undefined;

const adminProxy = auth(passThrough);
const employeeProxy = employeeAuth(passThrough);

function isEmployeePath(pathname: string) {
  return pathname === "/employee" || pathname.startsWith("/employee/");
}

export function proxy(request: NextRequest, event: NextFetchEvent) {
  return isEmployeePath(request.nextUrl.pathname) ? employeeProxy(request, event) : adminProxy(request, event);
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/no-access", "/employee/:path*"],
};
