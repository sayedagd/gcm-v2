import { describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { _internal } from "@/lib/server/writeProxy";

describe("writeProxy header forwarding", () => {
  test("forwards only allow-listed identity and security headers", () => {
    const request = new NextRequest("http://localhost/api/write/companies", {
      method: "POST",
      headers: {
        cookie: "gcm_jwt=abc; gcm_auth_session=true",
        authorization: "Bearer test-token",
        "x-gcm-auth": "VALID",
        "x-csrf-token": "abcdefghijklmnopqrstuvwxyz123456",
        "x-skip-validation": "true",
        "x-request-id": "req-123",
        "x-correlation-id": "corr-456",
        "content-type": "application/json",
      },
    });

    const headers = _internal.buildHeaders(request, "POST");

    expect(headers.get("cookie")).toContain("gcm_jwt=");
    expect(headers.get("authorization")).toBe("Bearer test-token");
    expect(headers.get("x-gcm-auth")).toBe("VALID");
    expect(headers.get("x-csrf-token")).toBe("abcdefghijklmnopqrstuvwxyz123456");
    expect(headers.get("x-skip-validation")).toBe("true");
    expect(headers.get("x-request-id")).toBe("req-123");
    expect(headers.get("x-correlation-id")).toBe("corr-456");
    expect(headers.get("content-type")).toBe("application/json");
  });

  test("drops unsafe or non-allowed forwarded headers", () => {
    vi.stubEnv("NODE_ENV", "production");

    const request = new NextRequest("http://localhost/api/write/companies", {
      method: "DELETE",
      headers: {
        authorization: "Basic abc",
        "x-gcm-auth": "INVALID",
        "x-csrf-token": "bad",
        "x-skip-validation": "true",
        "x-request-id": "req 123",
        "x-correlation-id": "corr@id",
        "content-type": "text/plain",
      },
    });

    const headers = _internal.buildHeaders(request, "DELETE");

    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("x-gcm-auth")).toBeNull();
    expect(headers.get("x-csrf-token")).toBeNull();
    expect(headers.get("x-skip-validation")).toBeNull();
    expect(headers.get("x-request-id")).toBeNull();
    expect(headers.get("x-correlation-id")).toBeNull();
    expect(headers.get("content-type")).toBeNull();

    vi.unstubAllEnvs();
  });
});
