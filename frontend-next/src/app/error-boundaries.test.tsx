// @vitest-environment jsdom

import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import GlobalError from "@/app/error";
import InternalError from "@/app/(internal)/error";
import TripsError from "@/app/(internal)/trips/error";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe("error boundary recovery UX", () => {
  let container: HTMLDivElement;
  let root: Root;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    pushMock.mockReset();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    consoleErrorSpy.mockRestore();
  });

  test("global boundary supports reset and safe fallback navigation", () => {
    const reset = vi.fn();

    act(() => {
      root.render(<GlobalError error={new Error("render failed")} reset={reset} />);
    });

    const buttons = Array.from(container.querySelectorAll("button"));
    const tryAgainButton = buttons.find((button) => button.textContent === "Try again");
    const fallbackButton = buttons.find((button) => button.textContent === "Go to dashboard");

    expect(tryAgainButton).toBeTruthy();
    expect(fallbackButton).toBeTruthy();

    act(() => {
      tryAgainButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      fallbackButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(reset).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  test("route-group boundary provides dashboard fallback", () => {
    const reset = vi.fn();

    act(() => {
      root.render(<InternalError error={new Error("group failed")} reset={reset} />);
    });

    const fallbackButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Go to dashboard",
    );

    act(() => {
      fallbackButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  test("feature boundary renders failed-load copy and supports retry", () => {
    const reset = vi.fn();

    act(() => {
      root.render(<TripsError error={new Error("fetch failed")} reset={reset} />);
    });

    expect(container.textContent).toContain("Trips page failed to load");

    const tryAgainButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Try again",
    );

    act(() => {
      tryAgainButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
