"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_COOKIE,
  LEGACY_BOOTSTRAP_COOKIE,
  ROLE_COOKIE,
  SESSION_EXP_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/features/auth/model/sessionCookies";
import { getRoleHome, isGcmRole } from "@/lib/auth";

export type LoginActionState = {
  error: string | null;
};

type BackendLoginResponse = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  company_id?: string | null;
  project_id?: string | null;
  supplier_id?: string | null;
  token?: string;
  tokenExpiresInSeconds?: number;
};

const getApiBaseUrl = () => {
  return process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
};

const isSafeNextPath = (path: string) => {
  if (!path.startsWith("/")) {
    return false;
  }

  if (path.startsWith("//")) {
    return false;
  }

  return path !== "/login" && path !== "/logout";
};

export async function loginAction(_: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const nextPath = String(formData.get("next") || "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  const apiBaseUrl = getApiBaseUrl();
  let role: string | undefined;
  let expiresInSeconds = SESSION_MAX_AGE_SECONDS;
  let payload: BackendLoginResponse | null = null;

  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { error: "Invalid email or password." };
      }

      return { error: "Unable to sign in right now. Please try again." };
    }

    payload = (await response.json().catch(() => null)) as BackendLoginResponse | null;
    role = payload?.role;
    if (!isGcmRole(role)) {
      return { error: "Your account role is not supported." };
    }

    expiresInSeconds =
      typeof payload?.tokenExpiresInSeconds === "number" && payload.tokenExpiresInSeconds > 0
        ? payload.tokenExpiresInSeconds
        : SESSION_MAX_AGE_SECONDS;
  } catch {
    return { error: "Unable to reach the server. Check your connection and try again." };
  }

  if (!isGcmRole(role)) {
    return { error: "Your account role is not supported." };
  }

  const expiresAtMs = Date.now() + expiresInSeconds * 1000;
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    maxAge: expiresInSeconds,
  };

  cookieStore.set(AUTH_COOKIE, "true", cookieOptions);
  cookieStore.set(ROLE_COOKIE, role, cookieOptions);
  cookieStore.set(SESSION_EXP_COOKIE, String(expiresAtMs), cookieOptions);

  const bootstrapPayload = {
    id: payload?.id || "",
    name: payload?.name || "",
    email,
    role,
    company_id: payload?.company_id || null,
    project_id: payload?.project_id || null,
    supplier_id: payload?.supplier_id || null,
    token: payload?.token || "",
    expiresAtMs,
  };

  cookieStore.set(LEGACY_BOOTSTRAP_COOKIE, encodeURIComponent(JSON.stringify(bootstrapPayload)), {
    sameSite: "lax",
    path: "/",
    maxAge: expiresInSeconds,
  });

  if (isSafeNextPath(nextPath)) {
    redirect(nextPath);
  }

  redirect(getRoleHome(role));
}
