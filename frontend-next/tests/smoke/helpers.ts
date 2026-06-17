import { expect, type Page } from '@playwright/test';

export const smokeBaseUrl =
  process.env.SMOKE_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.BASE_URL ||
  'http://127.0.0.1:3000';

export const smokeCredentials = {
  email: process.env.SMOKE_ADMIN_EMAIL || 'admin@gcm.local',
  password: process.env.SMOKE_ADMIN_PASSWORD || 'secret',
};

export const smokeMutationMode = process.env.SMOKE_ENABLE_MUTATIONS === 'true';
const csrfCookieName = process.env.NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME || 'gcm_csrf';

export async function expectApiHealthy(page: Page) {
  const response = await page.request.get('/api/v1/config');
  expect(response.ok(), 'config endpoint should return 2xx').toBeTruthy();
}

export async function loginAsAdmin(page: Page, nextPath = '/dashboard') {
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`);

  await page.locator('input[type="email"]').fill(smokeCredentials.email);
  await page.locator('input[type="password"]').fill(smokeCredentials.password);
  await page.locator('button[type="submit"]').click();

  await page.waitForURL((url) => url.pathname === nextPath, { timeout: 60_000 });
}

type CompanyWritePayload = {
  company_id: string;
  company_name: string;
};

const readCookieValue = (cookieName: string) => {
  if (typeof document === 'undefined') {
    return null;
  }

  const prefix = `${cookieName}=`;
  const match = document.cookie
    .split(';')
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(prefix));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.slice(prefix.length));
};

async function fetchWithClientAuth<T>(page: Page, path: string, method: 'POST' | 'DELETE', body?: unknown) {
  return page.evaluate(
    async ({ path, method, body, csrfCookieName }) => {
      const readCookie = (cookieName: string) => {
        const prefix = `${cookieName}=`;
        const match = document.cookie
          .split(';')
          .map((chunk) => chunk.trim())
          .find((chunk) => chunk.startsWith(prefix));

        if (!match) {
          return null;
        }

        return decodeURIComponent(match.slice(prefix.length));
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-gcm-auth': 'VALID',
      };

      const csrfToken = readCookie(csrfCookieName);
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const requestInit: RequestInit = {
        method,
        credentials: 'include',
        headers,
      };

      if (body !== undefined) {
        requestInit.body = JSON.stringify(body);
      }

      const response = await fetch(path, requestInit);

      const text = await response.text();
      let json: unknown = null;

      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = text;
      }

      return { status: response.status, ok: response.ok, json };
    },
    { path, method, body, csrfCookieName },
  );
}

export async function createSmokeCompany(page: Page, companyId: string, companyName: string) {
  const payload: CompanyWritePayload = { company_id: companyId, company_name: companyName };
  return fetchWithClientAuth(page, '/api/write/companies', 'POST', payload);
}

export async function deleteSmokeCompany(page: Page, companyId: string) {
  return fetchWithClientAuth(page, `/api/write/companies/${companyId}`, 'DELETE');
}
