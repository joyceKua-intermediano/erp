import type { Metadata } from "next";
import { CircleAlertIcon } from "lucide-react";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { ClientStateReset } from "@/components/auth/client-state-reset";
import { EmployeeLoginForm } from "@/components/auth/employee-login-form";
import { isEmployeeMicrosoftEnabled, isGoogleEnabled } from "@/lib/env";

export const metadata: Metadata = {
  title: "Employee sign in",
};

const DEFAULT_CALLBACK_URL = "/employee/dashboard";

const errorMessages: Record<string, string> = {
  CredentialsSignin: "Email or password is incorrect.",
  LoginLocked: "Too many failed sign-in attempts. Wait 15 minutes and try again.",
  AccessDenied:
    "This account isn't registered as an Intermediano employee, or its email couldn't be verified. Contact HR.",
  Configuration: "Sign-in isn't configured correctly. Please contact HR.",
};

async function LoginForm({ searchParams }: Pick<PageProps<"/employee/login">, "searchParams">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const callbackUrl =
    typeof params.callbackUrl === "string" && /^\/employee(\/|$|\?)/.test(params.callbackUrl)
      ? params.callbackUrl
      : DEFAULT_CALLBACK_URL;

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <span>{errorMessages[error] ?? "Sign-in failed. Please try again."}</span>
        </div>
      )}
      <EmployeeLoginForm
        callbackUrl={callbackUrl}
        googleEnabled={isGoogleEnabled}
        microsoftEnabled={isEmployeeMicrosoftEnabled}
      />
    </div>
  );
}

export default function EmployeeLoginPage({ searchParams }: PageProps<"/employee/login">) {
  return (
    <AuthCard
      title="Sign in to the Employee hub"
      description="See your timesheets, payslips and documents."
      footer="Use the email address registered with Intermediano."
    >
      <ClientStateReset />
      <Suspense
        fallback={
          <EmployeeLoginForm
            callbackUrl={DEFAULT_CALLBACK_URL}
            googleEnabled={isGoogleEnabled}
            microsoftEnabled={isEmployeeMicrosoftEnabled}
          />
        }
      >
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}
