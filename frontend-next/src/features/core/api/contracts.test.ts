import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ApiError, createApiClient } from '@/api/client';

describe('critical auth/system/write endpoint contracts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('auth login uses v1 endpoint contract', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'U-1', role: 'ADMIN', token: 'jwt-token' }),
      statusText: 'OK',
    } as unknown as Response);

    const client = createApiClient('http://api.local');
    await client.login({ email: 'admin@gcm.local', password: 'secret' });

    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall?.[0]).toBe('http://api.local/api/v1/auth/login');
  });

  test('system backup status uses v1 endpoint contract', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'healthy' }),
      statusText: 'OK',
    } as unknown as Response);

    const client = createApiClient('http://api.local');
    await client.getBackupStatus();

    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall?.[0]).toBe('http://api.local/api/v1/system/backup/status');
  });

  test('critical write endpoints remain on Next write boundary', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
      statusText: 'OK',
    } as unknown as Response);

    const client = createApiClient('http://api.local');
    await client.upsertCompany({ company_id: 'C-1', company_name: 'Alpha' });
    await client.deleteCompany('C-1');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/write/companies');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/write/companies/C-1');
  });

  test('write error contract surfaces code and localized messages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      json: async () => ({
        code: 'TRIP_VALIDATION_FAILED',
        errorEn: 'Trip payload is invalid.',
        errorAr: 'بيانات الرحلة غير صالحة.',
      }),
    } as unknown as Response);

    const client = createApiClient('http://api.local');

    await expect(client.upsertTrip({ trip_id: 'T-1' })).rejects.toBeInstanceOf(ApiError);

    try {
      await client.upsertTrip({ trip_id: 'T-1' });
    } catch (error) {
      const apiError = error as ApiError;
      expect(apiError.code).toBe('TRIP_VALIDATION_FAILED');
      expect(apiError.messageEn).toBe('Trip payload is invalid.');
      expect(apiError.messageAr).toBe('بيانات الرحلة غير صالحة.');
      expect(apiError.statusCode).toBe(422);
    }
  });
});
