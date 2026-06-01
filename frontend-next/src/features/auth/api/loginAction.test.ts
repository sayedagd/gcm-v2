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
  beforeEach(() => {
    cookieSetMock.mockReset();
    redirectMock.mockClear();
  });

  test("returns error for invalid role", async () => {
    const formData = new FormData();
    formData.set("role", "NOT_A_ROLE");

    const result = await loginAction({ error: null }, formData);

    expect(result).toEqual({ error: "Invalid role." });
    expect(cookieSetMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  test("sets auth cookies and redirects to next path", async () => {
    const formData = new FormData();
    formData.set("role", "ADMIN");
    formData.set("next", "/db");

    await expect(loginAction({ error: null }, formData)).rejects.toThrow("REDIRECT:/db");

    expect(cookieSetMock).toHaveBeenCalledWith(AUTH_COOKIE, "true", expect.objectContaining({ path: "/" }));
    expect(cookieSetMock).toHaveBeenCalledWith(ROLE_COOKIE, "ADMIN", expect.objectContaining({ path: "/" }));
    expect(cookieSetMock).toHaveBeenCalledWith(
      SESSION_EXP_COOKIE,
      expect.any(String),
      expect.objectContaining({ path: "/" }),
    );
    expect(redirectMock).toHaveBeenCalledWith("/db");
  });
});
