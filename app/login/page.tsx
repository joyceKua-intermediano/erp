import type { Metadata } from "next";
import { CircleAlertIcon } from "lucide-react";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginButtons } from "@/components/auth/login-buttons";
import { isGoogleEnabled } from "@/lib/env";

export const metadata: Metadata = {
  title: "Sign in",
};

const DEFAULT_CALLBACK_URL = "/admin/dashboard";

const errorMessages: Record<string, string> = {
  AccessDenied: "This account isn't registered in Intermediano ERP. Ask an admin to add you.",
  Configuration: "Sign-in isn't configured correctly. Please contact an administrator.",
};

async function LoginForm({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const callbackUrl =
    typeof params.callbackUrl === "string" && params.callbackUrl.startsWith("/") && !params.callbackUrl.startsWith("//")
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
      <LoginButtons callbackUrl={callbackUrl} googleEnabled={isGoogleEnabled} />
    </div>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthCard
      title="Sign in to Intermediano ERP"
      description="Use your work account to access the admin console."
      footer="Only registered Intermediano users can sign in."
    >
      <Suspense fallback={<LoginButtons callbackUrl={DEFAULT_CALLBACK_URL} googleEnabled={isGoogleEnabled} />}>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}
