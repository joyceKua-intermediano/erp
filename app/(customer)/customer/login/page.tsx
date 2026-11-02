import type { Metadata } from "next";
import { CircleAlertIcon } from "lucide-react";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { ClientStateReset } from "@/components/auth/client-state-reset";
import { CustomerLoginForm } from "@/components/auth/customer-login-form";

export const metadata: Metadata = {
  title: "Client sign in",
};

const DEFAULT_CALLBACK_URL = "/customer/dashboard";

const errorMessages: Record<string, string> = {
  CredentialsSignin: "Email or password is incorrect.",
  LoginLocked: "Too many failed sign-in attempts. Wait 15 minutes and try again.",
  PartnerAccount: "Partner accounts aren't available in this portal yet. Contact your Intermediano representative.",
  Configuration: "Sign-in isn't configured correctly. Please contact Intermediano.",
};

async function LoginForm({ searchParams }: Pick<PageProps<"/customer/login">, "searchParams">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const callbackUrl =
    typeof params.callbackUrl === "string" && /^\/customer(\/|$|\?)/.test(params.callbackUrl)
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
      <CustomerLoginForm callbackUrl={callbackUrl} />
    </div>
  );
}

export default function CustomerLoginPage({ searchParams }: PageProps<"/customer/login">) {
  return (
    <AuthCard
      title="Sign in to the Client portal"
      description="Review contracts and approve your team's timesheets, vacations and expenses."
      footer="Use the account Intermediano created for your company."
    >
      <ClientStateReset />
      <Suspense fallback={<CustomerLoginForm callbackUrl={DEFAULT_CALLBACK_URL} />}>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}
