"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { redirect, unstable_rethrow } from "next/navigation";
import {
  CUSTOMER_HOME_PATH,
  CUSTOMER_LOGIN_LOCKED_CODE,
  CUSTOMER_LOGIN_PATH,
  CUSTOMER_PASSWORD_PROVIDER,
  PARTNER_ACCOUNT_CODE,
  customerSignIn,
  customerSignOut,
} from "@/lib/customer-auth";

// Only portal pages are valid destinations, so a crafted callbackUrl can't send customers elsewhere.
function safeCallbackUrl(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.startsWith("//") || !/^\/customer(\/|$|\?)/.test(value)) {
    return CUSTOMER_HOME_PATH;
  }
  return value;
}

function loginErrorType(error: unknown) {
  if (error instanceof CredentialsSignin && error.code === CUSTOMER_LOGIN_LOCKED_CODE) return "LoginLocked";
  if (error instanceof CredentialsSignin && error.code === PARTNER_ACCOUNT_CODE) return "PartnerAccount";
  return error instanceof AuthError ? error.type : "Default";
}

function loginErrorUrl(error: unknown, callbackUrl: string) {
  const params = new URLSearchParams({ error: loginErrorType(error), callbackUrl });
  return `${CUSTOMER_LOGIN_PATH}?${params.toString()}`;
}

export async function signInCustomerWithPassword(formData: FormData) {
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));
  try {
    await customerSignIn(CUSTOMER_PASSWORD_PROVIDER, {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: callbackUrl,
    });
  } catch (error) {
    unstable_rethrow(error);
    if (!(error instanceof AuthError && error.type === "CredentialsSignin")) {
      console.error("customer password signIn failed", { error });
    }
    redirect(loginErrorUrl(error, callbackUrl));
  }
}

export async function signOutCustomer() {
  try {
    await customerSignOut({ redirectTo: CUSTOMER_LOGIN_PATH });
  } catch (error) {
    unstable_rethrow(error);
    console.error("customer signOut failed", { error });
    redirect(CUSTOMER_LOGIN_PATH);
  }
}
