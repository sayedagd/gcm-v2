type MutationScope =
  | "companies"
  | "projects"
  | "trips"
  | "services"
  | "vehicles"
  | "drivers"
  | "suppliers"
  | "facilities";

const SYNC_CHANNEL = "gcm_sync";
const SYNC_STORAGE_KEY = "gcm_sync_reload";

export const broadcastMutationInvalidation = (scope: MutationScope) => {
  if (typeof window === "undefined") {
    return;
  }

  const payload = {
    type: "RELOAD_ALL",
    data: {
      scope,
      ts: Date.now(),
    },
  };

  try {
    const channel = new BroadcastChannel(SYNC_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  } catch {
    // Ignore and fallback to storage event below.
  }

  try {
    window.localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(payload));
    window.localStorage.removeItem(SYNC_STORAGE_KEY);
  } catch {
    // Ignore storage fallback failures.
  }
};
