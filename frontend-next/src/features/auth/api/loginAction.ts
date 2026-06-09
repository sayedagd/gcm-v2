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
import { HttpResponseError, performHttpJsonRequest } from "@/api/http";

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
  tokenExpiresInSeconds?: number;
};

const extractCookieValueFromSetCookie = (setCookieHeader: string | null, cookieName: string): string | null => {
  if (!setCookieHeader) {
    return null;
  }

  const cookies = setCookieHeader.split(/,(?=[^;]+?=)/g);
  for (const cookieEntry of cookies) {
    const firstSegment = cookieEntry.split(";")[0]?.trim() || "";
    const separatorIndex = firstSegment.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const name = firstSegment.slice(0, separatorIndex).trim();
    if (name !== cookieName) {
      continue;
    }

    return firstSegment.slice(separatorIndex + 1).trim() || null;
  }

  return null;
};

const getAuthBackendCookieName = () => process.env.AUTH_COOKIE_NAME || "gcm_jwt";
const getCsrfBackendCookieName = () => process.env.AUTH_CSRF_COOKIE_NAME || "gcm_csrf";

const getCookieSecurityProfile = () => {
  const sameSiteRaw = (process.env.AUTH_COOKIE_SAMESITE || "lax").toLowerCase();
  const sameSite = sameSiteRaw === "strict" || sameSiteRaw === "none" ? sameSiteRaw : "lax";
  const secure = process.env.AUTH_COOKIE_SECURE === "true" || process.env.NODE_ENV === "production" || sameSite === "none";

  return {
    sameSite,
    secure,
  };
};

const resolveBackendCookieOptions = (maxAge: number) => {
  const { sameSite, secure } = getCookieSecurityProfile();

  return {
    httpOnly: true as const,
    sameSite: sameSite as "lax" | "strict" | "none",
    secure,
    path: "/",
    maxAge,
  };
};

const resolveAppCookieOptions = (maxAge: number) => {
  const { sameSite, secure } = getCookieSecurityProfile();

  return {
    httpOnly: true as const,
    sameSite: sameSite as "lax" | "strict" | "none",
    secure,
    path: "/",
    maxAge,
  };
};

const getApiBaseUrl = () => {
  const configured = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (configured) {
    return configured;
  }

  return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
    ? "http://localhost:8080"
    : "";
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
  if (!apiBaseUrl) {
    return { error: "Server connection is not configured. Please contact support." };
  }
  let role: string | undefined;
  let expiresInSeconds = SESSION_MAX_AGE_SECONDS;
  let payload: BackendLoginResponse | null = null;
  let backendSessionToken: string | null = null;
  let csrfToken: string | null = null;

  try {
    const { data, response } = await performHttpJsonRequest<BackendLoginResponse>(`${apiBaseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    payload = data || null;
    backendSessionToken = extractCookieValueFromSetCookie(
      response.headers.get("set-cookie"),
      getAuthBackendCookieName(),
    );
    csrfToken = extractCookieValueFromSetCookie(
      response.headers.get("set-cookie"),
      getCsrfBackendCookieName(),
    );
    role = payload?.role;
    if (!isGcmRole(role)) {
      return { error: "Your account role is not supported." };
    }

    expiresInSeconds =
      typeof payload?.tokenExpiresInSeconds === "number" && payload.tokenExpiresInSeconds > 0
        ? payload.tokenExpiresInSeconds
        : SESSION_MAX_AGE_SECONDS;
  } catch (error) {
    if (error instanceof HttpResponseError && error.status === 401) {
      return { error: "Invalid email or password." };
    }

    if (error instanceof HttpResponseError && error.code !== "FETCH_NETWORK_ERROR") {
      return { error: "Unable to sign in right now. Please try again." };
    }

    return { error: "Unable to reach the server. Check your connection and try again." };
  }

  if (!isGcmRole(role)) {
    return { error: "Your account role is not supported." };
  }

  const expiresAtMs = Date.now() + expiresInSeconds * 1000;
  const cookieStore = await cookies();
  const appCookieOptions = resolveAppCookieOptions(expiresInSeconds);

  if (!backendSessionToken) {
    return { error: "Unable to establish authenticated session. Please try again." };
  }

  cookieStore.set(getAuthBackendCookieName(), backendSessionToken, resolveBackendCookieOptions(expiresInSeconds));
  if (csrfToken) {
    cookieStore.set(getCsrfBackendCookieName(), csrfToken, {
      sameSite: appCookieOptions.sameSite,
      secure: appCookieOptions.secure,
      path: "/",
      maxAge: expiresInSeconds,
    });
  }

  cookieStore.set(AUTH_COOKIE, "true", appCookieOptions);
  cookieStore.set(ROLE_COOKIE, role, appCookieOptions);
  cookieStore.set(SESSION_EXP_COOKIE, String(expiresAtMs), appCookieOptions);

  const bootstrapPayload = {
    id: payload?.id || "",
    name: payload?.name || "",
    email,
    role,
    company_id: payload?.company_id || null,
    project_id: payload?.project_id || null,
    supplier_id: payload?.supplier_id || null,
    expiresAtMs,
  };

  cookieStore.set(LEGACY_BOOTSTRAP_COOKIE, encodeURIComponent(JSON.stringify(bootstrapPayload)), {
    sameSite: appCookieOptions.sameSite,
    secure: appCookieOptions.secure,
    path: "/",
    maxAge: expiresInSeconds,
  });

  if (isSafeNextPath(nextPath)) {
    redirect(nextPath);
  }

  redirect(getRoleHome(role));
}
