export const hasAuthSessionCookie = (): boolean => {
  if (typeof document === "undefined") {
    return false;
  }

  return document.cookie
    .split(";")
    .map((chunk) => chunk.trim())
    .some((chunk) => chunk.startsWith("gcm_auth_session=true"));
};

const readCookieValue = (name: string): string | null => {
  if (typeof document === "undefined") {
    return null;
  }

  const prefix = `${name}=`;
  const match = document.cookie
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(prefix));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.slice(prefix.length));
};

export const getClientAuthHeaders = (): Record<string, string> => {
  if (!hasAuthSessionCookie()) {
    return {};
  }

  const headers: Record<string, string> = { "x-gcm-auth": "VALID" };
  const csrfToken = readCookieValue(process.env.NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME || "gcm_csrf");

  if (csrfToken) {
    headers["x-csrf-token"] = csrfToken;
  }

  return headers;
};
