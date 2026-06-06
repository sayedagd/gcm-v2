import { NextRequest, NextResponse } from "next/server";
import { ENDPOINTS } from "@/api/endpoints";
import { WriteEntity } from "@/lib/server/writeValidation";

const ENTITY_ENDPOINTS: Record<WriteEntity, string> = {
  companies: ENDPOINTS.COMPANIES.BASE,
  projects: ENDPOINTS.PROJECTS.BASE,
  trips: ENDPOINTS.TRIPS.BASE,
  services: ENDPOINTS.SERVICES.BASE,
  vehicles: ENDPOINTS.FLEET.VEHICLES,
  drivers: ENDPOINTS.FLEET.DRIVERS,
  suppliers: "/api/v1/suppliers",
  facilities: "/api/v1/facilities",
};

const resolveBackendBaseUrl = (): string => {
  const baseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
  return baseUrl.replace(/\/$/, "");
};

const SAFE_HEADER_VALUE = /^[A-Za-z0-9._:-]{1,128}$/;
const BEARER_PREFIX = "Bearer ";
const CSRF_TOKEN_VALUE = /^[A-Za-z0-9_-]{16,256}$/;

const copyHeader = (
  headers: Headers,
  source: NextRequest,
  name: string,
  isAllowed: (value: string) => boolean = () => true,
) => {
  const rawValue = source.headers.get(name);
  if (!rawValue) {
    return;
  }

  const value = rawValue.trim();
  if (!value || !isAllowed(value)) {
    return;
  }

  headers.set(name, value);
};

const buildHeaders = (request: NextRequest, method: "POST" | "DELETE"): Headers => {
  const headers = new Headers();
  copyHeader(headers, request, "cookie");
  copyHeader(headers, request, "authorization", (value) =>
    value.startsWith(BEARER_PREFIX) && value.length <= 4096,
  );
  copyHeader(headers, request, "x-gcm-auth", (value) => value === "VALID");
  copyHeader(headers, request, "x-csrf-token", (value) => CSRF_TOKEN_VALUE.test(value));
  copyHeader(
    headers,
    request,
    "x-skip-validation",
    (value) => process.env.NODE_ENV !== "production" && value === "true",
  );
  copyHeader(headers, request, "x-request-id", (value) => SAFE_HEADER_VALUE.test(value));
  copyHeader(headers, request, "x-correlation-id", (value) => SAFE_HEADER_VALUE.test(value));

  if (method === "POST") {
    copyHeader(headers, request, "content-type", (value) =>
      value.toLowerCase().includes("application/json"),
    );
  }

  return headers;
};

const responseFromBackend = async (response: Response): Promise<NextResponse> => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  }

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: { "content-type": contentType || "text/plain" },
  });
};

export const forwardWriteRequest = async (
  request: NextRequest,
  entity: WriteEntity,
  method: "POST" | "DELETE",
  id?: string,
  bodyText?: string,
) => {
  const baseUrl = resolveBackendBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      {
        error: "Backend API base URL is not configured.",
        code: "BACKEND_URL_MISSING",
      },
      { status: 500 },
    );
  }

  const endpoint = `${baseUrl}${ENTITY_ENDPOINTS[entity]}${id ? `/${id}` : ""}`;
  const init: RequestInit = {
    method,
    headers: buildHeaders(request, method),
    cache: "no-store",
  };

  if (method === "POST") {
    init.body = bodyText ?? (await request.text());
  }

  const response = await fetch(endpoint, init);

  return responseFromBackend(response);
};

export const _internal = {
  buildHeaders,
  resolveBackendBaseUrl,
};
