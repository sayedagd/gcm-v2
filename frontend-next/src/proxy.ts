import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AUTH_COOKIE,
  LEGACY_BOOTSTRAP_COOKIE,
  ROLE_COOKIE,
  SESSION_EXP_COOKIE,
} from "@/features/auth/model/sessionCookies";
import { API_LEGACY_PREFIX } from "@/features/core/model/endpoints";
import { getRequiredRoles, getRoleHome, isGcmRole } from "@/lib/auth";

const PUBLIC_ONLY_PATHS = ["/", "/login"];
const BACKEND_AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || "gcm_jwt";
const LEGACY_ROUTE_REDIRECTS: Record<string, string> = {
  "/db": "/dashboard",
  "/c": "/companies",
  "/p": "/projects",
  "/t": "/trips",
  "/f": "/fleet",
  "/iv": "/inventory",
  "/dr": "/drivers",
  "/sup": "/suppliers",
  "/fac": "/facilities",
  "/acc": "/accountant-portal",
  "/u": "/user-management",
  "/s": "/services",
  "/l": "/activity-logs",
  "/st": "/settings",
  "/sys": "/system-monitor",
  "/le": "/landing-settings",
  "/rd": "/reports-dashboard",
  "/pr": "/profile",
  "/logistics/queue": "/logistics/trip-queue",
};
const CANONICAL_HOST = (process.env.NEXT_PUBLIC_CANONICAL_HOST || "gcm.twision.agency").toLowerCase();
const ENABLE_CANONICAL_HOST_REDIRECT =
  (process.env.ENABLE_CANONICAL_HOST_REDIRECT ?? (process.env.VERCEL_ENV === "production" ? "true" : "false")) ===
  "true";

export function proxy(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const requestHost = (forwardedHost.split(":")[0] || "").toLowerCase();

  if (
    ENABLE_CANONICAL_HOST_REDIRECT &&
    requestHost.endsWith(".vercel.app") &&
    requestHost !== CANONICAL_HOST
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.hostname = CANONICAL_HOST;
    redirectUrl.port = "";
    redirectUrl.protocol = "https";
    return NextResponse.redirect(redirectUrl, 308);
  }

  const { pathname } = request.nextUrl;
  const redirectPath = LEGACY_ROUTE_REDIRECTS[pathname];
  const effectivePath = redirectPath ?? pathname;

  if (pathname === "/logout") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "signed_out");
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(BACKEND_AUTH_COOKIE);
    response.cookies.delete(AUTH_COOKIE);
    response.cookies.delete(ROLE_COOKIE);
    response.cookies.delete(SESSION_EXP_COOKIE);
    response.cookies.delete(LEGACY_BOOTSTRAP_COOKIE);
    return response;
  }

  if (pathname.startsWith("/_next") || pathname.startsWith(API_LEGACY_PREFIX) || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const isAuthenticated = request.cookies.get(AUTH_COOKIE)?.value === "true";
  const roleValue = request.cookies.get(ROLE_COOKIE)?.value;
  const role = isGcmRole(roleValue) ? roleValue : undefined;
  const expirationValue = request.cookies.get(SESSION_EXP_COOKIE)?.value;
  const expiresAtMs = Number(expirationValue || "0");
  const hasValidExpiration = Number.isFinite(expiresAtMs) && expiresAtMs > Date.now();

  if (!isAuthenticated) {
    const requiredRoles = getRequiredRoles(effectivePath);
    if (requiredRoles) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", effectivePath);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (!hasValidExpiration) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "session_expired");
    if (effectivePath.startsWith("/") && effectivePath !== "/login") {
      loginUrl.searchParams.set("next", effectivePath);
    }

    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(BACKEND_AUTH_COOKIE);
    response.cookies.delete(AUTH_COOKIE);
    response.cookies.delete(ROLE_COOKIE);
    response.cookies.delete(SESSION_EXP_COOKIE);
    return response;
  }

  if (!role) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(BACKEND_AUTH_COOKIE);
    response.cookies.delete(AUTH_COOKIE);
    response.cookies.delete(ROLE_COOKIE);
    response.cookies.delete(SESSION_EXP_COOKIE);
    return response;
  }

  if (PUBLIC_ONLY_PATHS.includes(effectivePath)) {
    return NextResponse.redirect(new URL(getRoleHome(role), request.url));
  }

  const requiredRoles = getRequiredRoles(effectivePath);
  if (!requiredRoles) {
    if (redirectPath) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = redirectPath;
      return NextResponse.redirect(redirectUrl, 308);
    }
    return NextResponse.next();
  }

  if (!requiredRoles.includes(role)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  if (redirectPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = redirectPath;
    return NextResponse.redirect(redirectUrl, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
