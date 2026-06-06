import { describe, expect, test } from "vitest";
import { proxy } from "@/proxy";
import { NextRequest } from "next/server";

const makeRequest = (path: string, cookie?: string) => {
  const headers = new Headers();
  if (cookie) {
    headers.set("cookie", cookie);
  }

  return new NextRequest(`http://localhost:3000${path}`, {
    headers,
  });
};

describe("proxy route compatibility and protection", () => {
  test("allows unauthenticated access to /landing", () => {
    const response = proxy(makeRequest("/landing"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  test("allows unauthenticated access to /store", () => {
    const response = proxy(makeRequest("/store"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  test("allows unauthenticated access to /home", () => {
    const response = proxy(makeRequest("/home"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  test("logout clears backend and app auth cookies", () => {
    const response = proxy(makeRequest("/logout", "gcm_jwt=token; gcm_auth_session=true; gcm_current_role=ADMIN"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?reason=signed_out");

    const setCookie = response.headers.get("set-cookie") || "";
    expect(setCookie).toContain("gcm_jwt=");
    expect(setCookie).toContain("gcm_auth_session=");
    expect(setCookie).toContain("gcm_current_role=");
    expect(setCookie).toContain("gcm_auth_exp=");
  });

  test("redirects unauthenticated legacy internal route to login with canonical next path", () => {
    const response = proxy(makeRequest("/db"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fdashboard");
  });

  test("expires stale authenticated session and redirects to login", () => {
    const nowMinusMinute = Date.now() - 60 * 1000;
    const response = proxy(
      makeRequest(
        "/dashboard",
        `gcm_jwt=token; gcm_auth_session=true; gcm_current_role=ADMIN; gcm_auth_exp=${nowMinusMinute}`,
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?reason=session_expired&next=%2Fdashboard",
    );

    const setCookie = response.headers.get("set-cookie") || "";
    expect(setCookie).toContain("gcm_jwt=");
    expect(setCookie).toContain("gcm_auth_session=");
    expect(setCookie).toContain("gcm_current_role=");
    expect(setCookie).toContain("gcm_auth_exp=");
  });

  test("rejects invalid role cookie and clears auth state", () => {
    const nowPlusHour = Date.now() + 60 * 60 * 1000;
    const response = proxy(
      makeRequest(
        "/dashboard",
        `gcm_jwt=token; gcm_auth_session=true; gcm_current_role=NOT_A_ROLE; gcm_auth_exp=${nowPlusHour}`,
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");

    const setCookie = response.headers.get("set-cookie") || "";
    expect(setCookie).toContain("gcm_jwt=");
    expect(setCookie).toContain("gcm_auth_session=");
    expect(setCookie).toContain("gcm_current_role=");
    expect(setCookie).toContain("gcm_auth_exp=");
  });

  test("redirects authenticated admin from legacy route to canonical path", () => {
    const nowPlusHour = Date.now() + 60 * 60 * 1000;
    const response = proxy(
      makeRequest(
        "/db",
        `gcm_auth_session=true; gcm_current_role=ADMIN; gcm_auth_exp=${nowPlusHour}`,
      ),
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  test("blocks unauthorized role when legacy route maps to protected internal route", () => {
    const nowPlusHour = Date.now() + 60 * 60 * 1000;
    const response = proxy(
      makeRequest(
        "/db",
        `gcm_auth_session=true; gcm_current_role=CLIENT; gcm_auth_exp=${nowPlusHour}`,
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/unauthorized");
  });

  test("redirects authenticated user away from public-only login path to role home", () => {
    const nowPlusHour = Date.now() + 60 * 60 * 1000;
    const response = proxy(
      makeRequest(
        "/login",
        `gcm_auth_session=true; gcm_current_role=ADMIN; gcm_auth_exp=${nowPlusHour}`,
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  test("allows authenticated admin access to /landing", () => {
    const nowPlusHour = Date.now() + 60 * 60 * 1000;
    const response = proxy(
      makeRequest(
        "/landing",
        `gcm_auth_session=true; gcm_current_role=ADMIN; gcm_auth_exp=${nowPlusHour}`,
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  test("allows authenticated admin access to /store", () => {
    const nowPlusHour = Date.now() + 60 * 60 * 1000;
    const response = proxy(
      makeRequest(
        "/store",
        `gcm_auth_session=true; gcm_current_role=ADMIN; gcm_auth_exp=${nowPlusHour}`,
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
