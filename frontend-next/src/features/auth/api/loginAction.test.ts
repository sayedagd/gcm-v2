import { beforeEach, describe, expect, test, vi } from "vitest";
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

  beforeEach(() => {
    cookieSetMock.mockReset();
    redirectMock.mockClear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
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
      json: async () => ({ role: "ADMIN", tokenExpiresInSeconds: 3600 }),
    });

    await expect(loginAction({ error: null }, formData)).rejects.toThrow("REDIRECT:/db");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cookieSetMock).toHaveBeenCalledWith(AUTH_COOKIE, "true", expect.objectContaining({ path: "/" }));
    expect(cookieSetMock).toHaveBeenCalledWith(ROLE_COOKIE, "ADMIN", expect.objectContaining({ path: "/" }));
    expect(cookieSetMock).toHaveBeenCalledWith(
      SESSION_EXP_COOKIE,
      expect.any(String),
      expect.objectContaining({ path: "/" }),
    );
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });
});
