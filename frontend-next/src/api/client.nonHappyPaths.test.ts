import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createApiClient } from '@/api/client';

describe('api non-happy-path regressions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('returns ApiError for 401 unauthorized reads', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'AUTH_NO_TOKEN', errorEn: 'Auth Failed' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = createApiClient('http://api.local');

    await expect(client.getCompanies()).rejects.toMatchObject({
      statusCode: 401,
      code: 'AUTH_NO_TOKEN',
      messageEn: 'Auth Failed',
    });
  });

  test('returns ApiError for 403 forbidden system routes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'AUTH_FORBIDDEN', errorEn: 'Forbidden' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = createApiClient('http://api.local');

    await expect(client.getBackupStatus()).rejects.toMatchObject({
      statusCode: 403,
      code: 'AUTH_FORBIDDEN',
      messageEn: 'Forbidden',
    });
  });

  test('returns ApiError for 422 validation failures on write boundary', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'TRIP_VALIDATION_FAILED',
          field: 'trip_id',
          errorEn: 'Trip payload is invalid.',
          errorAr: 'بيانات الرحلة غير صالحة.',
        }),
        {
          status: 422,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );

    const client = createApiClient('http://api.local');

    await expect(client.upsertTrip({ trip_id: '' })).rejects.toMatchObject({
      statusCode: 422,
      code: 'TRIP_VALIDATION_FAILED',
      field: 'trip_id',
      messageEn: 'Trip payload is invalid.',
      messageAr: 'بيانات الرحلة غير صالحة.',
    });
  });

  test('returns ApiError for 429 rate limit responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'RATE_LIMITED', errorEn: 'Too many requests.' }), {
        status: 429,
        headers: {
          'content-type': 'application/json',
          'retry-after': '60',
        },
      }),
    );

    const client = createApiClient('http://api.local');

    await expect(client.login({ email: 'rate@limited.local', password: 'secret' })).rejects.toMatchObject({
      statusCode: 429,
      code: 'RATE_LIMITED',
      messageEn: 'Too many requests.',
    });
  });

  test('returns ApiError for 500 server-side failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'SERVER_ERROR', errorEn: 'Unexpected server error' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = createApiClient('http://api.local');

    await expect(client.getConfig()).rejects.toMatchObject({
      statusCode: 500,
      code: 'SERVER_ERROR',
      messageEn: 'Unexpected server error',
    });
  });
});
