// @vitest-environment jsdom

import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useLiveStream } from "@/hooks/useLiveStream";

type MockStoreState = {
  isAuthenticated: boolean;
  currentUser: { id?: string };
  saasConfig: { language: string };
  addNotification: () => void;
  allTrips: unknown[];
  allProjects: unknown[];
  companies: unknown[];
  vehicles: unknown[];
  drivers: unknown[];
  assetRequests: unknown[];
  notifications: unknown[];
  containers: unknown[];
  tanks: unknown[];
  scales: unknown[];
};

type Selector<T> = (state: MockStoreState) => T;
type StoreUpdater = Partial<MockStoreState> | ((state: MockStoreState) => Partial<MockStoreState>);

const hoistedStore = vi.hoisted(() => {
  const state: MockStoreState = {
    isAuthenticated: true,
    currentUser: { id: "U-1" },
    saasConfig: { language: "en" },
    addNotification: () => undefined,
    allTrips: [],
    allProjects: [],
    companies: [],
    vehicles: [],
    drivers: [],
    assetRequests: [],
    notifications: [],
    containers: [],
    tanks: [],
    scales: [],
  };

  const useGCMStore = (<T,>(selector: Selector<T>) => selector(state)) as {
    <T>(selector: Selector<T>): T;
    setState: (updater: StoreUpdater) => void;
    getState: () => MockStoreState;
  };

  useGCMStore.setState = (updater: StoreUpdater) => {
    const patch = typeof updater === "function" ? updater(state) : updater;
    Object.assign(state, patch);
  };

  useGCMStore.getState = () => state;

  return { state, useGCMStore };
});

const mockState = hoistedStore.state;

vi.mock("@/store", () => ({
  useGCMStore: hoistedStore.useGCMStore,
}));

class MockEventSource {
  static instances: MockEventSource[] = [];

  readonly url: string;
  readonly addEventListener = vi.fn();
  readonly close = vi.fn();
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }
}

const LiveStreamHarness = () => {
  useLiveStream();
  return null;
};

describe("useLiveStream", () => {
  let container: HTMLDivElement;
  let root: Root;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    MockEventSource.instances = [];
    mockState.isAuthenticated = true;
    mockState.currentUser = { id: "U-1" };

    vi.stubGlobal("EventSource", MockEventSource as unknown as typeof EventSource);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    warnSpy.mockRestore();
  });

  test("opens EventSource with cookie-auth URL when session is valid", () => {
    act(() => {
      root.render(<LiveStreamHarness />);
    });

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0]?.url).toBe("/api/v1/events");
  });

  test("does not open EventSource when auth is expired before subscribe", () => {
    mockState.isAuthenticated = false;
    mockState.currentUser = {};

    act(() => {
      root.render(<LiveStreamHarness />);
    });

    expect(MockEventSource.instances).toHaveLength(0);
  });

  test("keeps reconnect behavior on stream error (no forced close)", () => {
    act(() => {
      root.render(<LiveStreamHarness />);
    });

    const es = MockEventSource.instances[0];
    expect(es).toBeTruthy();

    act(() => {
      es?.onerror?.();
    });

    expect(es?.close).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  test("closes stream when auth expires and reconnect source is removed", () => {
    act(() => {
      root.render(<LiveStreamHarness />);
    });

    const es = MockEventSource.instances[0];
    expect(es).toBeTruthy();

    mockState.isAuthenticated = false;
    mockState.currentUser = {};

    act(() => {
      root.render(<LiveStreamHarness />);
    });

    expect(es?.close).toHaveBeenCalledTimes(1);
  });
});
