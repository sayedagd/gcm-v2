import { beforeEach, describe, expect, test, vi } from "vitest";
import { ApiError, createApiClient } from "@/api/client";

describe("createApiClient auth flow integration", () => {
  beforeEach(() => {
    let hasSession = false;

    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      const pathname = new URL(url).pathname;

      if (pathname === "/api/v1/auth/login") {
        hasSession = true;
        return new Response(JSON.stringify({ status: "success", token: "jwt-token-1", id: "U-1", role: "ADMIN" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (pathname === "/api/v1/auth/logout") {
        hasSession = false;
        return new Response(JSON.stringify({ status: "success" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (pathname === "/api/v1/companies") {
        if (!hasSession) {
          return new Response(JSON.stringify({ error: "Auth Failed" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        return new Response(JSON.stringify([{ company_id: "company-1" }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }));
  });

  test("login -> protected succeeds -> logout -> protected fails with 401", async () => {
    const client = createApiClient("http://api.local");

    const sessionUser = await client.login({ email: "admin@gcm.local", password: "secret" });
    expect(sessionUser).not.toHaveProperty("token");
    await expect(client.getCompanies()).resolves.toEqual([{ company_id: "company-1" }]);

    await client.logout();
    let thrownError: unknown;
    try {
      await client.getCompanies();
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(ApiError);
    expect((thrownError as Error).message).toBe("Auth Failed");
  });
});
