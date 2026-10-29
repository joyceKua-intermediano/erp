"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { redirect, unstable_rethrow } from "next/navigation";
import {
  EMPLOYEE_HOME_PATH,
  EMPLOYEE_LOGIN_PATH,
  EMPLOYEE_PASSWORD_PROVIDER,
  LOGIN_LOCKED_CODE,
  employeeSignIn,
  employeeSignOut,
} from "@/lib/employee-auth";
import { isEmployeeMicrosoftEnabled, isGoogleEnabled } from "@/lib/env";

// Only portal pages are valid destinations, so a crafted callbackUrl can't send employees elsewhere.
function safeCallbackUrl(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.startsWith("//") || !/^\/employee(\/|$|\?)/.test(value)) {
    return EMPLOYEE_HOME_PATH;
  }
  return value;
}

function loginErrorType(error: unknown) {
  if (error instanceof CredentialsSignin && error.code === LOGIN_LOCKED_CODE) return "LoginLocked";
  return error instanceof AuthError ? error.type : "Default";
}

function loginErrorUrl(error: unknown, callbackUrl: string) {
  const params = new URLSearchParams({ error: loginErrorType(error), callbackUrl });
  return `${EMPLOYEE_LOGIN_PATH}?${params.toString()}`;
}

export async function signInEmployeeWithPassword(formData: FormData) {
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));
  try {
    await employeeSignIn(EMPLOYEE_PASSWORD_PROVIDER, {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: callbackUrl,
    });
  } catch (error) {
    unstable_rethrow(error);
    if (!(error instanceof AuthError && error.type === "CredentialsSignin")) {
      console.error("employee password signIn failed", { error });
    }
    redirect(loginErrorUrl(error, callbackUrl));
  }
}

async function signInEmployeeWith(provider: "microsoft-entra-id" | "google", formData: FormData) {
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));
  try {
    await employeeSignIn(provider, { redirectTo: callbackUrl });
  } catch (error) {
    unstable_rethrow(error);
    console.error("employee signIn failed", { provider, error });
    redirect(loginErrorUrl(error, callbackUrl));
  }
}

export async function signInEmployeeWithMicrosoft(formData: FormData) {
  if (!isEmployeeMicrosoftEnabled) {
    redirect(`${EMPLOYEE_LOGIN_PATH}?error=Configuration`);
  }
  await signInEmployeeWith("microsoft-entra-id", formData);
}

export async function signInEmployeeWithGoogle(formData: FormData) {
  if (!isGoogleEnabled) {
    redirect(`${EMPLOYEE_LOGIN_PATH}?error=Configuration`);
  }
  await signInEmployeeWith("google", formData);
}

export async function signOutEmployee() {
  try {
    await employeeSignOut({ redirectTo: EMPLOYEE_LOGIN_PATH });
  } catch (error) {
    unstable_rethrow(error);
    console.error("employee signOut failed", { error });
    redirect(EMPLOYEE_LOGIN_PATH);
  }
}
