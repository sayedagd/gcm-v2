import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fetchApiJson } from "@/lib/serverFetch";

describe("fetchApiJson trace propagation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    process.env = { ...originalEnv, API_BASE_URL: "https://api.example.test" };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  test("sends correlation headers on outbound request", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
      headers: new Headers(),
    } as unknown as Response);

    await fetchApiJson("/api/v1/ping", { strategy: "dynamic" });

    const callArgs = fetchMock.mock.calls[0];
    expect(callArgs).toBeDefined();
    const init = callArgs?.[1];
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get("x-correlation-id")).toBeTruthy();
    expect(headers.get("x-request-id")).toBeTruthy();
  });

  test("logs trace id from error envelope on failed responses", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ code: "AUTH_NO_TOKEN", traceId: "trace-err-1" }),
      headers: new Headers({ "x-correlation-id": "trace-hdr-1" }),
    } as unknown as Response);

    const result = await fetchApiJson("/api/v1/system/backup/status", { strategy: "dynamic" });

    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      "[serverFetch] API request failed",
      expect.objectContaining({
        traceId: "trace-err-1",
        code: "AUTH_NO_TOKEN",
      }),
    );
  });
});
