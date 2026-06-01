"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, ROLE_COOKIE, SESSION_EXP_COOKIE } from "@/features/auth/model/sessionCookies";

export type LogoutActionState = {
  error: string | null;
};

export async function logoutAction(state: LogoutActionState): Promise<LogoutActionState> {
  void state;

  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
  cookieStore.delete(ROLE_COOKIE);
  cookieStore.delete(SESSION_EXP_COOKIE);

  redirect("/landing");
}
