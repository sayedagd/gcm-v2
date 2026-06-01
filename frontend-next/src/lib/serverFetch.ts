type FetchStrategy = "dynamic" | "static" | "revalidate";

type FetchApiOptions = {
  strategy?: FetchStrategy;
  revalidateSeconds?: number;
  headers?: HeadersInit;
};

const generateTraceId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `trace-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getApiBaseUrl = () => {
  return process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
};

export async function fetchApiJson<T>(path: string, options: FetchApiOptions = {}): Promise<T | null> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return null;
  }

  const traceId = generateTraceId();

  const strategy = options.strategy || "dynamic";
  const requestInit: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {
    headers: {
      Accept: "application/json",
      "X-Correlation-Id": traceId,
      "X-Request-Id": traceId,
      ...(options.headers || {}),
    },
  };

  if (strategy === "dynamic") {
    requestInit.cache = "no-store";
  } else if (strategy === "static") {
    requestInit.cache = "force-cache";
  } else {
    requestInit.next = { revalidate: options.revalidateSeconds || 300 };
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, requestInit);
    if (!response.ok) {
      const responseTraceId = response.headers.get("x-correlation-id") || traceId;
      const errorPayload = await response.json().catch(() => null);
      const envelopeTraceId =
        errorPayload?.traceId || errorPayload?.errorInfo?.traceId || responseTraceId;

      console.error("[serverFetch] API request failed", {
        path,
        status: response.status,
        traceId: envelopeTraceId,
        code: errorPayload?.code || errorPayload?.errorInfo?.code || null,
      });
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}
