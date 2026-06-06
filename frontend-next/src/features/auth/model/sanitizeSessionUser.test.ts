import { describe, expect, test } from "vitest";
import { sanitizeSessionUser } from "@/features/auth/model/sanitizeSessionUser";
import type { Role } from "@/types";

describe("sanitizeSessionUser", () => {
  test("removes sensitive credential fields from session payload", () => {
    const user = {
      id: "U-1",
      name: "Admin",
      email: "admin@gcm.local",
      role: "ADMIN" as Role,
      password: "plaintext-should-not-persist",
      token: "jwt-token-1",
      tokenExpiresAt: 1735689600,
      tokenExpiresInSeconds: 3600,
    };

    const sanitized = sanitizeSessionUser(user);

    expect(sanitized).toMatchObject({
      id: "U-1",
      name: "Admin",
      email: "admin@gcm.local",
      role: "ADMIN",
    });
    expect(sanitized).not.toHaveProperty("password");
    expect(sanitized).not.toHaveProperty("token");
    expect(sanitized).not.toHaveProperty("tokenExpiresAt");
    expect(sanitized).not.toHaveProperty("tokenExpiresInSeconds");
  });
});
