"use server";

import { AuthError } from "next-auth";
import { redirect, unstable_rethrow } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { isGoogleEnabled } from "@/lib/env";

const DEFAULT_REDIRECT = "/admin/dashboard";

function safeCallbackUrl(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_REDIRECT;
  }
  return value;
}

async function signInWith(provider: "microsoft-entra-id" | "google", formData: FormData) {
  try {
    await signIn(provider, { redirectTo: safeCallbackUrl(formData.get("callbackUrl")) });
  } catch (error) {
    unstable_rethrow(error);
    console.error("signIn failed", { provider, error });
    redirect(`/login?error=${error instanceof AuthError ? error.type : "Default"}`);
  }
}

export async function signInWithMicrosoft(formData: FormData) {
  await signInWith("microsoft-entra-id", formData);
}

export async function signInWithGoogle(formData: FormData) {
  if (!isGoogleEnabled) {
    redirect("/login?error=Configuration");
  }
  await signInWith("google", formData);
}

export async function signOutAction() {
  try {
    await signOut({ redirectTo: "/login" });
  } catch (error) {
    unstable_rethrow(error);
    console.error("signOut failed", { error });
    redirect("/login");
  }
}
