import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { _internal, forwardWriteRequest } from "@/lib/server/writeProxy";

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

describe("writeProxy critical regression flows", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      API_BASE_URL: "http://backend.internal:8080",
      NODE_ENV: "test",
    };
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("returns BACKEND_URL_MISSING when no backend base url is configured", async () => {
    delete process.env.API_BASE_URL;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;

    const request = new NextRequest("http://localhost/api/write/trips", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trip_id: "TRIP-1" }),
    });

    const response = await forwardWriteRequest(request, "trips", "POST");
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.code).toBe("BACKEND_URL_MISSING");
  });

  test("forwards POST writes with no-store cache and request body", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const body = JSON.stringify({ trip_id: "TRIP-101" });
    const request = new NextRequest("http://localhost/api/write/trips", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "gcm_jwt=token",
      },
      body,
    });

    const response = await forwardWriteRequest(request, "trips", "POST");
    const payload = await response.json();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    if (!call) {
      throw new Error("Expected fetch call to be present");
    }

    const [endpoint, init] = call;
    expect(endpoint).toBe("http://backend.internal:8080/api/v1/trips");
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).cache).toBe("no-store");
    expect((init as RequestInit).body).toBe(body);
    expect(payload.ok).toBe(true);
  });
});
