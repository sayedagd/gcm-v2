type FetchStrategy = "dynamic" | "static" | "revalidate";

import {
  HttpResponseError,
  generateRequestTraceId,
  performHttpJsonRequest,
  type ExtendedRequestInit,
} from "@/api/http";

type FetchApiOptions = {
  strategy?: FetchStrategy;
  revalidateSeconds?: number;
  headers?: HeadersInit;
};

export type ServerFetchSuccess<T> = {
  ok: true;
  data: T;
  traceId: string;
};

export type ServerFetchFailure = {
  ok: false;
  error: {
    path: string;
    status: number;
    code: string | null;
    traceId: string;
    message: string;
  };
};

export type ServerFetchResult<T> = ServerFetchSuccess<T> | ServerFetchFailure;

const generateTraceId = () => {
  return generateRequestTraceId();
};

const getApiBaseUrl = () => {
  return process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
};

export async function fetchApiJson<T>(path: string, options: FetchApiOptions = {}): Promise<ServerFetchResult<T>> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: {
        path,
        status: 500,
        code: "API_BASE_URL_MISSING",
        traceId: "not-configured",
        message: "API base URL is not configured",
      },
    };
  }

  const traceId = generateTraceId();

  const strategy = options.strategy || "dynamic";
  const requestInit: ExtendedRequestInit = {
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
    const { data } = await performHttpJsonRequest<T>(`${baseUrl}${path}`, requestInit);
    return {
      ok: true,
      data,
      traceId,
    };
  } catch (error) {
    if (error instanceof HttpResponseError) {
      const errorPayload = error.payload as
        | {
            errorEn?: string;
            error?: string;
            code?: string;
            errorInfo?: { code?: string };
          }
        | null;
      console.error("[serverFetch] API request failed", {
        path,
        status: error.status,
        traceId: error.traceId,
        code: error.code,
      });
      return {
        ok: false,
        error: {
          path,
          status: error.status,
          code: error.code,
          traceId: error.traceId,
          message: errorPayload?.errorEn || errorPayload?.error || "API request failed",
        },
      };
    }

    return {
      ok: false,
      error: {
        path,
        status: 500,
        code: "FETCH_NETWORK_ERROR",
        traceId,
        message: "Network request failed",
      },
    };
  }
}
