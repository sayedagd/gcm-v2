import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ApiError, createApiClient } from '@/api/client';
import { proxy } from '@/proxy';

const makeRequest = (path: string, cookie?: string) => {
  const headers = new Headers();
  if (cookie) {
    headers.set('cookie', cookie);
  }

  return new NextRequest(`http://localhost:3000${path}`, { headers });
};

describe('core journey regression suite', () => {
  beforeEach(() => {
    let hasSession = false;

    vi.restoreAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        const pathname = new URL(url, 'http://localhost').pathname;

        if (pathname === '/api/v1/auth/login') {
          hasSession = true;
          return new Response(JSON.stringify({ id: 'U-1', role: 'ADMIN', token: 'session-token' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }

        if (pathname === '/api/v1/auth/logout') {
          hasSession = false;
          return new Response(JSON.stringify({ status: 'success' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }

        if (pathname === '/api/v1/companies' && hasSession) {
          return new Response(JSON.stringify([{ company_id: 'C-1', company_name: 'Alpha' }]), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }

        if (pathname === '/api/write/companies' && hasSession) {
          return new Response(JSON.stringify({ status: 'success', id: 'C-2' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }

        if (pathname === '/api/write/companies/C-2' && hasSession) {
          return new Response(JSON.stringify({ status: 'success' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }

        if (!hasSession && (pathname === '/api/v1/companies' || pathname.startsWith('/api/write/companies'))) {
          return new Response(JSON.stringify({ error: 'Auth Failed' }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ error: 'Not Found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        });
      }),
    );
  });

  test('login, protected read, logout, and post-logout rejection', async () => {
    const client = createApiClient('http://api.local');

    await expect(client.login({ email: 'admin@gcm.local', password: 'secret' })).resolves.toMatchObject({
      id: 'U-1',
      role: 'ADMIN',
    });
    await expect(client.getCompanies()).resolves.toEqual([{ company_id: 'C-1', company_name: 'Alpha' }]);

    await client.logout();
    await expect(client.getCompanies()).rejects.toBeInstanceOf(ApiError);
  });

  test('internal dashboard CRUD baseline via companies write boundary', async () => {
    const client = createApiClient('http://api.local');
    await client.login({ email: 'admin@gcm.local', password: 'secret' });

    await expect(client.upsertCompany({ company_id: 'C-2', company_name: 'Bravo' })).resolves.toMatchObject({
      status: 'success',
      id: 'C-2',
    });

    await expect(client.deleteCompany('C-2')).resolves.toMatchObject({ status: 'success' });
  });

  test('role path routing for client, subcontractor, and driver remains enforced', () => {
    const nowPlusHour = Date.now() + 60 * 60 * 1000;

    const clientDashboard = proxy(
      makeRequest('/client/dashboard', `gcm_auth_session=true; gcm_current_role=CLIENT; gcm_auth_exp=${nowPlusHour}`),
    );
    expect(clientDashboard.status).toBe(200);

    const subcontractorDashboard = proxy(
      makeRequest(
        '/subcontractor/dashboard',
        `gcm_auth_session=true; gcm_current_role=SUBCONTRACTOR; gcm_auth_exp=${nowPlusHour}`,
      ),
    );
    expect(subcontractorDashboard.status).toBe(200);

    const driverHome = proxy(
      makeRequest('/driver', `gcm_auth_session=true; gcm_current_role=DRIVER; gcm_auth_exp=${nowPlusHour}`),
    );
    expect(driverHome.status).toBe(200);

    const deniedClientToDriverRoute = proxy(
      makeRequest('/driver', `gcm_auth_session=true; gcm_current_role=CLIENT; gcm_auth_exp=${nowPlusHour}`),
    );
    expect(deniedClientToDriverRoute.status).toBe(307);
    expect(deniedClientToDriverRoute.headers.get('location')).toBe('http://localhost:3000/unauthorized');
  });

  test('public landing and store routes stay reachable without authentication', () => {
    const landing = proxy(makeRequest('/landing'));
    const store = proxy(makeRequest('/store'));

    expect(landing.status).toBe(200);
    expect(store.status).toBe(200);
  });
});
