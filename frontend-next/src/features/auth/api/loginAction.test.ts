import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { loginAction } from "@/features/auth/api/loginAction";
import { AUTH_COOKIE, ROLE_COOKIE, SESSION_EXP_COOKIE } from "@/features/auth/model/sessionCookies";

const { cookieSetMock, redirectMock } = vi.hoisted(() => ({
  cookieSetMock: vi.fn(),
  redirectMock: vi.fn((target: string) => {
    throw new Error(`REDIRECT:${target}`);
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: cookieSetMock,
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("loginAction", () => {
  const fetchMock = vi.fn();
  const originalEnv = process.env;

  beforeEach(() => {
    cookieSetMock.mockReset();
    redirectMock.mockClear();
    fetchMock.mockReset();
    process.env = { ...originalEnv };
    process.env.API_BASE_URL = "http://localhost:8080";
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("returns error for invalid email", async () => {
    const formData = new FormData();
    formData.set("email", "invalid-email");
    formData.set("password", "123");

    const result = await loginAction({ error: null }, formData);

    expect(result).toEqual({ error: "Please enter a valid email address." });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(cookieSetMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  test("returns error on backend 401", async () => {
    const formData = new FormData();
    formData.set("email", "admin@gcm.com");
    formData.set("password", "wrong");

    fetchMock.mockResolvedValue({ ok: false, status: 401 });

    const result = await loginAction({ error: null }, formData);

    expect(result).toEqual({ error: "Invalid email or password." });
    expect(cookieSetMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  test("sets auth cookies and redirects to next path after successful backend login", async () => {
    const formData = new FormData();
    formData.set("email", "admin@gcm.com");
    formData.set("password", "123");
    formData.set("next", "/dashboard");

    fetchMock.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "set-cookie"
            ? "gcm_jwt=jwt-token-1; Path=/; HttpOnly; SameSite=Lax, gcm_csrf=csrf-token-1; Path=/; SameSite=Lax"
            : null,
      },
      json: async () => ({ role: "ADMIN", tokenExpiresInSeconds: 3600 }),
    });

    await expect(loginAction({ error: null }, formData)).rejects.toThrow("REDIRECT:/dashboard");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cookieSetMock).toHaveBeenCalledWith(AUTH_COOKIE, "true", expect.objectContaining({ path: "/" }));
    expect(cookieSetMock).toHaveBeenCalledWith(ROLE_COOKIE, "ADMIN", expect.objectContaining({ path: "/" }));
    expect(cookieSetMock).toHaveBeenCalledWith("gcm_jwt", "jwt-token-1", expect.objectContaining({ path: "/" }));
    expect(cookieSetMock).toHaveBeenCalledWith("gcm_csrf", "csrf-token-1", expect.objectContaining({ path: "/" }));
    expect(cookieSetMock).toHaveBeenCalledWith(
      SESSION_EXP_COOKIE,
      expect.any(String),
      expect.objectContaining({ path: "/" }),
    );
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  test("returns error when backend response has no auth cookie", async () => {
    const formData = new FormData();
    formData.set("email", "admin@gcm.com");
    formData.set("password", "123");

    fetchMock.mockResolvedValue({
      ok: true,
      headers: {
        get: () => null,
      },
      json: async () => ({ role: "ADMIN", tokenExpiresInSeconds: 3600 }),
    });

    const result = await loginAction({ error: null }, formData);

    expect(result).toEqual({ error: "Unable to establish authenticated session. Please try again." });
    expect(cookieSetMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  test("uses AUTH_COOKIE_NAME when configured", async () => {
    process.env.AUTH_COOKIE_NAME = "custom_auth_cookie";

    const formData = new FormData();
    formData.set("email", "admin@gcm.com");
    formData.set("password", "123");

    fetchMock.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "set-cookie"
            ? "custom_auth_cookie=jwt-token-2; Path=/; HttpOnly; SameSite=Lax"
            : null,
      },
      json: async () => ({ role: "ADMIN", tokenExpiresInSeconds: 3600 }),
    });

    await expect(loginAction({ error: null }, formData)).rejects.toThrow("REDIRECT:/dashboard");

    expect(cookieSetMock).toHaveBeenCalledWith(
      "custom_auth_cookie",
      "jwt-token-2",
      expect.objectContaining({ path: "/" }),
    );
  });

  test("applies secure cookie profile when AUTH_COOKIE_SECURE is enabled", async () => {
    process.env.AUTH_COOKIE_SECURE = "true";

    const formData = new FormData();
    formData.set("email", "admin@gcm.com");
    formData.set("password", "123");

    fetchMock.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "set-cookie"
            ? "gcm_jwt=jwt-token-secure; Path=/; HttpOnly; SameSite=Lax, gcm_csrf=csrf-token-secure; Path=/; SameSite=Lax"
            : null,
      },
      json: async () => ({ role: "ADMIN", tokenExpiresInSeconds: 3600 }),
    });

    await expect(loginAction({ error: null }, formData)).rejects.toThrow("REDIRECT:/dashboard");

    expect(cookieSetMock).toHaveBeenCalledWith(
      AUTH_COOKIE,
      "true",
      expect.objectContaining({ secure: true, sameSite: "lax" }),
    );
    expect(cookieSetMock).toHaveBeenCalledWith(
      "gcm_jwt",
      "jwt-token-secure",
      expect.objectContaining({ secure: true, sameSite: "lax" }),
    );
    expect(cookieSetMock).toHaveBeenCalledWith(
      "gcm_csrf",
      "csrf-token-secure",
      expect.objectContaining({ secure: true, sameSite: "lax" }),
    );
  });
});
