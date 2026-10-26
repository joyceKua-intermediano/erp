import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "No access",
};

async function SignedInAs() {
  const email = (await getSessionUser())?.email ?? null;

  if (!email) return null;

  return (
    <p className="rounded-xl bg-muted px-3 py-2.5 text-center text-sm">
      Signed in as <span className="font-medium">{email}</span>
    </p>
  );
}

export default function NoAccessPage() {
  return (
    <AuthCard
      title="Your account has no role yet"
      description="You're signed in, but an administrator still needs to assign you a role before you can use the admin console."
    >
      <div className="flex flex-col gap-4">
        <Suspense fallback={<Skeleton className="h-10 rounded-xl" />}>
          <SignedInAs />
        </Suspense>
        <SignOutButton />
      </div>
    </AuthCard>
  );
}
