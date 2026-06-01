import { beforeEach, describe, expect, test, vi } from "vitest";
import { API_ENDPOINTS } from "@/features/core/model/endpoints";
import { getSystemConfig } from "@/features/core/api/systemApi";

const { fetchApiJsonMock } = vi.hoisted(() => ({
  fetchApiJsonMock: vi.fn(),
}));

vi.mock("@/lib/serverFetch", () => ({
  fetchApiJson: fetchApiJsonMock,
}));

describe("getSystemConfig", () => {
  beforeEach(() => {
    fetchApiJsonMock.mockReset();
  });

  test("uses system config endpoint with revalidate strategy defaults", async () => {
    fetchApiJsonMock.mockResolvedValue({ enabled: true });

    const result = await getSystemConfig();

    expect(fetchApiJsonMock).toHaveBeenCalledWith(API_ENDPOINTS.system.config, {
      strategy: "revalidate",
      revalidateSeconds: 600,
    });
    expect(result).toEqual({ enabled: true });
  });

  test("allows custom revalidate window", async () => {
    fetchApiJsonMock.mockResolvedValue({ version: "v1" });

    await getSystemConfig({ revalidateSeconds: 120 });

    expect(fetchApiJsonMock).toHaveBeenCalledWith(API_ENDPOINTS.system.config, {
      strategy: "revalidate",
      revalidateSeconds: 120,
    });
  });
});
