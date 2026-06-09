type NextFetchConfig = {
  revalidate?: number | false | undefined;
  tags?: string[] | undefined;
};

export type ExtendedRequestInit = RequestInit & {
  next?: NextFetchConfig | undefined;
};

export class HttpResponseError extends Error {
  status: number;
  traceId: string;
  code: string | null;
  payload: unknown;

  constructor(input: {
    status: number;
    traceId: string;
    code?: string | null;
    message: string;
    payload?: unknown;
  }) {
    super(input.message);
    this.status = input.status;
    this.traceId = input.traceId;
    this.code = input.code ?? null;
    this.payload = input.payload;
  }
}

export const generateRequestTraceId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `trace-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const parseJsonSafely = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const getHeader = (response: Response, name: string) => {
  const headers = (response as { headers?: { get?: (key: string) => string | null } }).headers;
  if (!headers || typeof headers.get !== "function") {
    return null;
  }

  return headers.get(name);
};

export const performHttpJsonRequest = async <T>(
  url: string,
  init: ExtendedRequestInit = {},
): Promise<{ data: T; traceId: string; response: Response }> => {
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch {
    throw new HttpResponseError({
      status: 500,
      traceId: generateRequestTraceId(),
      code: "FETCH_NETWORK_ERROR",
      message: "Network request failed",
      payload: null,
    });
  }

  const payload = await parseJsonSafely(response);
  const responseTraceId = getHeader(response, "x-correlation-id") || getHeader(response, "x-request-id");
  const envelopeTraceId =
    (payload as { traceId?: string; errorInfo?: { traceId?: string } } | null)?.traceId ||
    (payload as { errorInfo?: { traceId?: string } } | null)?.errorInfo?.traceId ||
    responseTraceId ||
    generateRequestTraceId();

  if (!response.ok) {
    const payloadCode =
      (payload as { code?: string; errorInfo?: { code?: string } } | null)?.code ||
      (payload as { errorInfo?: { code?: string } } | null)?.errorInfo?.code ||
      null;

    throw new HttpResponseError({
      status: response.status,
      traceId: envelopeTraceId,
      code: payloadCode,
      message:
        (payload as { errorEn?: string; error?: string } | null)?.errorEn ||
        (payload as { error?: string } | null)?.error ||
        response.statusText ||
        "API request failed",
      payload,
    });
  }

  return {
    data: payload as T,
    traceId: envelopeTraceId,
    response,
  };
};
