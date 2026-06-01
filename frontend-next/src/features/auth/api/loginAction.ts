"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_COOKIE,
  ROLE_COOKIE,
  SESSION_EXP_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/features/auth/model/sessionCookies";
import { GCM_ROLE_VALUES, getRoleHome, type GcmRole } from "@/lib/auth";

export type LoginActionState = {
  error: string | null;
};

export async function loginAction(_: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const rawRole = String(formData.get("role") || "");
  if (!GCM_ROLE_VALUES.includes(rawRole as GcmRole)) {
    return { error: "Invalid role." };
  }

  const role = rawRole as GcmRole;
  const nextPath = String(formData.get("next") || "");
  const expiresAtMs = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;

  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };

  cookieStore.set(AUTH_COOKIE, "true", cookieOptions);
  cookieStore.set(ROLE_COOKIE, role, cookieOptions);
  cookieStore.set(SESSION_EXP_COOKIE, String(expiresAtMs), cookieOptions);

  if (nextPath.startsWith("/")) {
    redirect(nextPath);
  }

  redirect(getRoleHome(role));
}
