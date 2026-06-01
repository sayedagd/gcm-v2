"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, ROLE_COOKIE } from "@/features/auth/model/sessionCookies";
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

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, "true", { httpOnly: true, sameSite: "lax", path: "/" });
  cookieStore.set(ROLE_COOKIE, role, { httpOnly: true, sameSite: "lax", path: "/" });

  if (nextPath.startsWith("/")) {
    redirect(nextPath);
  }

  redirect(getRoleHome(role));
}
