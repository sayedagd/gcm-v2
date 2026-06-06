import { describe, expect, test, vi } from "vitest";

const redirectMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("/home legacy route parity", () => {
  test("redirects to /landing", async () => {
    const homePageModule = await import("@/app/home/page");
    homePageModule.default();

    expect(redirectMock).toHaveBeenCalledWith("/landing");
  });
});
