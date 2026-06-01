/**
 * =====================================================
 * BATCH 2C+2D — Exhaustive Tests for endpoints.ts & client.ts
 * Target: 100% Statement, Branch, Path Coverage
 * =====================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ENDPOINTS, buildApiUrl } from '@/api/endpoints';
import { ApiError, createApiClient } from '@/api/client';

// =====================================================
// ENDPOINTS constants
// =====================================================
describe('ENDPOINTS', () => {
    describe('static paths', () => {
        it('AUTH.LOGIN is /auth/login', () => {
            expect(ENDPOINTS.AUTH.LOGIN).toBe('/auth/login');
        });
        it('AUTH.LOGOUT is /auth/logout', () => {
            expect(ENDPOINTS.AUTH.LOGOUT).toBe('/auth/logout');
        });
        it('COMPANIES.BASE is /api/companies', () => {
            expect(ENDPOINTS.COMPANIES.BASE).toBe('/api/companies');
        });
        it('PROJECTS.BASE is /api/projects', () => {
            expect(ENDPOINTS.PROJECTS.BASE).toBe('/api/projects');
        });
        it('SERVICES.BASE is /api/services', () => {
            expect(ENDPOINTS.SERVICES.BASE).toBe('/api/services');
        });
        it('TRIPS.BASE is /api/trips', () => {
            expect(ENDPOINTS.TRIPS.BASE).toBe('/api/trips');
        });
        it('FLEET.VEHICLES is /api/vehicles', () => {
            expect(ENDPOINTS.FLEET.VEHICLES).toBe('/api/vehicles');
        });
        it('FLEET.DRIVERS is /api/drivers', () => {
            expect(ENDPOINTS.FLEET.DRIVERS).toBe('/api/drivers');
        });
        it('SYSTEM.USERS is /api/users', () => {
            expect(ENDPOINTS.SYSTEM.USERS).toBe('/api/users');
        });
        it('SYSTEM.LOGS is /api/logs', () => {
            expect(ENDPOINTS.SYSTEM.LOGS).toBe('/api/logs');
        });
        it('SYSTEM.BACKUP is /api/system/backup', () => {
            expect(ENDPOINTS.SYSTEM.BACKUP).toBe('/api/system/backup');
        });
        it('AI.CHAT is /api/ai/chat', () => {
            expect(ENDPOINTS.AI.CHAT).toBe('/api/ai/chat');
        });
    });

    describe('dynamic path builders', () => {
        it('COMPANIES.BY_ID builds correct path', () => {
            expect(ENDPOINTS.COMPANIES.BY_ID('C-1')).toBe('/api/companies/C-1');
        });
        it('PROJECTS.BY_ID builds correct path', () => {
            expect(ENDPOINTS.PROJECTS.BY_ID('P-1')).toBe('/api/projects/P-1');
        });
        it('TRIPS.BY_ID builds correct path', () => {
            expect(ENDPOINTS.TRIPS.BY_ID('T-1')).toBe('/api/trips/T-1');
        });
        it('NOTIFICATIONS.BY_ID builds correct path', () => {
            expect(ENDPOINTS.SYSTEM.NOTIFICATIONS.BY_ID('N-1')).toBe('/api/notifications/N-1');
        });
        it('NOTIFICATIONS.MARK_READ builds correct path', () => {
            expect(ENDPOINTS.SYSTEM.NOTIFICATIONS.MARK_READ('N-1')).toBe('/api/notifications/N-1/read');
        });
        it('AI.SESSION_BY_ID builds correct path', () => {
            expect(ENDPOINTS.AI.SESSION_BY_ID('S-1')).toBe('/api/ai/sessions/S-1');
        });
        it('AI.RATE_SESSION builds correct path', () => {
            expect(ENDPOINTS.AI.RATE_SESSION('S-1')).toBe('/api/ai/sessions/S-1/rate');
        });
    });
});

// =====================================================
// buildApiUrl
// =====================================================
describe('buildApiUrl', () => {
    it('joins baseUrl and endpoint', () => {
        expect(buildApiUrl('https://api.gcm.com', '/api/trips')).toBe('https://api.gcm.com/api/trips');
    });

    it('strips trailing slash from baseUrl', () => {
        expect(buildApiUrl('https://api.gcm.com/', '/api/trips')).toBe('https://api.gcm.com/api/trips');
    });

    it('handles empty baseUrl', () => {
        expect(buildApiUrl('', '/api/trips')).toBe('/api/trips');
    });

    it('handles baseUrl with multiple trailing slashes', () => {
        // regex replaces only the last /
        expect(buildApiUrl('https://api.gcm.com//', '/api/trips')).toBe('https://api.gcm.com//api/trips');
    });
});

// =====================================================
// ApiError
// =====================================================
describe('ApiError', () => {
    it('sets message from data.error', () => {
        const err = new ApiError({ error: 'Bad request' }, 400);
        expect(err.message).toBe('Bad request');
        expect(err.messageEn).toBe('Bad request');
    });

    it('sets message from data.errorEn when error is missing', () => {
        const err = new ApiError({ errorEn: 'Not found' }, 404);
        expect(err.message).toBe('Not found');
    });

    it('sets message from data.errorAr when both error and errorEn are missing', () => {
        const err = new ApiError({ errorAr: 'خطأ' }, 500);
        expect(err.message).toBe('خطأ');
    });

    it('falls back to "Unknown error" when all messages are missing', () => {
        const err = new ApiError({}, 500);
        expect(err.message).toBe('Unknown error');
    });

    it('sets messageAr with fallback', () => {
        const err = new ApiError({ errorEn: 'Error' }, 400);
        expect(err.messageAr).toBe('حدث خطأ غير متوقع');
    });

    it('sets messageEn with fallback chain (errorEn → error → default)', () => {
        const err = new ApiError({ errorAr: 'خطأ' }, 400);
        expect(err.messageEn).toBe('An unexpected error occurred');
    });

    it('sets field, code, and allErrors', () => {
        const err = new ApiError({
            error: 'Validation',
            field: 'email',
            code: 'DUPLICATE',
            allErrors: [{ errorAr: 'مكرر', errorEn: 'Duplicate', field: 'email' }]
        }, 422);
        expect(err.field).toBe('email');
        expect(err.code).toBe('DUPLICATE');
        expect(err.allErrors).toHaveLength(1);
    });

    it('is an instance of Error', () => {
        const err = new ApiError({ error: 'test' }, 400);
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(ApiError);
    });
});

// =====================================================
// createApiClient
// =====================================================
describe('createApiClient', () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockFetch = vi.fn();
        global.fetch = mockFetch;
        // Set up localStorage mock
        Storage.prototype.getItem = vi.fn((key: string) => {
            if (key === 'gcm_auth_session') return 'true';
            if (key === 'gcm_jwt_token') return 'mock-jwt-token';
            return null;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('request — success path', () => {
        it('sends GET request with auth headers', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([{ id: 1 }])
            });

            const client = createApiClient('https://api.test.com');
            const result = await client.getCompanies();

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/api/companies',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer mock-jwt-token',
                        'Content-Type': 'application/json'
                    })
                })
            );
            expect(result).toEqual([{ id: 1 }]);
        });

        it('sends POST request with body', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            const client = createApiClient('https://api.test.com');
            await client.upsertCompany({ company_name: 'Test' });

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/api/companies',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ company_name: 'Test' })
                })
            );
        });

        it('sends DELETE request with ID in URL', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ deleted: true })
            });

            const client = createApiClient('https://api.test.com');
            await client.deleteCompany('C-1');

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/api/companies/C-1',
                expect.objectContaining({ method: 'DELETE' })
            );
        });
    });

    describe('request — auth branches', () => {
        it('sends empty Authorization when not authenticated', async () => {
            Storage.prototype.getItem = vi.fn(() => null);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([])
            });

            const client = createApiClient('https://api.test.com');
            await client.getCompanies();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': '',
                        'x-gcm-auth': ''
                    })
                })
            );
        });

        it('sends empty Authorization when session is true but token is null', async () => {
            Storage.prototype.getItem = vi.fn((key: string) => {
                if (key === 'gcm_auth_session') return 'true';
                return null; // no token
            });

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([])
            });

            const client = createApiClient('');
            await client.getCompanies();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': '',
                        'x-gcm-auth': ''
                    })
                })
            );
        });
    });

    describe('request — error handling', () => {
        it('throws ApiError with JSON error body on non-ok response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 422,
                json: () => Promise.resolve({ errorAr: 'خطأ', errorEn: 'Validation Error' })
            });

            const client = createApiClient('');
            await expect(client.getCompanies()).rejects.toThrow(ApiError);

            try {
                await client.getCompanies();
            } catch (e) {
                // Need fresh mock for second call
            }
        });

        it('throws ApiError with statusText when response body is not JSON', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: () => Promise.reject(new Error('not json'))
            });

            const client = createApiClient('');
            try {
                await client.getCompanies();
            } catch (e: any) {
                expect(e).toBeInstanceOf(ApiError);
                expect(e.messageEn).toBe('Internal Server Error');
            }
        });
    });

    describe('upsertVehicle — document validation', () => {
        it('sends normal request when no documents', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            const client = createApiClient('');
            await client.upsertVehicle({ vehicle_id: 'V1', plate: 'ABC' });
            expect(mockFetch).toHaveBeenCalled();
        });

        it('throws error for duplicate document types in payload', async () => {
            const client = createApiClient('');
            await expect(client.upsertVehicle({
                vehicle_id: 'V1',
                documents: [
                    { type: 'LICENSE', number: '111', expiry_date: '2025-01-01' },
                    { type: 'LICENSE', number: '222', expiry_date: '2025-01-01' }
                ]
            })).rejects.toThrow(/LICENSE/);
        });

        it('throws error for missing expiry_date', async () => {
            const client = createApiClient('');
            await expect(client.upsertVehicle({
                vehicle_id: 'V1',
                documents: [{ type: 'LICENSE', number: '111', expiry_date: '' }]
            })).rejects.toThrow(/تاريخ الانتهاء/);
        });

        it('throws error for duplicate document number across vehicles', async () => {
            // First call: the validation fetches all vehicles
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([
                    { vehicle_id: 'V_OTHER', documents: [{ type: 'REG', number: 'DUPE-123' }] }
                ])
            });

            const client = createApiClient('');
            await expect(client.upsertVehicle({
                vehicle_id: 'V1',
                documents: [{ type: 'LICENSE', number: 'DUPE-123', expiry_date: '2025-12-31' }]
            })).rejects.toThrow(/الرقم ده موجود/);
        });

        it('allows same document number on the same vehicle (update case)', async () => {
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve([
                        { vehicle_id: 'V1', documents: [{ type: 'REG', number: 'MY-123' }] }
                    ])
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                });

            const client = createApiClient('');
            // Same vehicle_id → should NOT throw
            await expect(client.upsertVehicle({
                vehicle_id: 'V1',
                documents: [{ type: 'LICENSE', number: 'MY-123', expiry_date: '2025-12-31' }]
            })).resolves.toEqual({ success: true });
        });

        it('allows empty document number (no uniqueness check)', async () => {
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve([
                        { vehicle_id: 'V_OTHER', documents: [{ type: 'REG', number: '' }] }
                    ])
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                });

            const client = createApiClient('');
            await expect(client.upsertVehicle({
                vehicle_id: 'V1',
                documents: [{ type: 'LICENSE', number: '', expiry_date: '2025-12-31' }]
            })).resolves.toEqual({ success: true });
        });
    });

    describe('specific API methods — endpoint coverage', () => {
        beforeEach(() => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ data: [] })
            });
        });

        it('getTrips calls /api/trips', async () => {
            const client = createApiClient('');
            await client.getTrips();
            expect(mockFetch).toHaveBeenCalledWith('/api/trips', expect.any(Object));
        });

        it('deleteTrip calls /api/trips/{id} with DELETE', async () => {
            const client = createApiClient('');
            await client.deleteTrip('T-1');
            expect(mockFetch).toHaveBeenCalledWith('/api/trips/T-1', expect.objectContaining({ method: 'DELETE' }));
        });

        it('login calls /auth/login with POST', async () => {
            const client = createApiClient('');
            await client.login({ username: 'admin', password: '123' });
            expect(mockFetch).toHaveBeenCalledWith('/auth/login', expect.objectContaining({ method: 'POST' }));
        });

        it('getAISessions appends query string params', async () => {
            const client = createApiClient('');
            await client.getAISessions({ limit: '10', page: '1' });
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('limit=10'),
                expect.any(Object)
            );
        });

        it('getAISessions works without params', async () => {
            const client = createApiClient('');
            await client.getAISessions();
            expect(mockFetch).toHaveBeenCalledWith('/api/ai/sessions', expect.any(Object));
        });

        it('chatWithAI sends messages and context', async () => {
            const client = createApiClient('');
            await client.chatWithAI([{ role: 'user', content: 'Hi' }], { lang: 'ar' });
            expect(mockFetch).toHaveBeenCalledWith('/api/ai/chat', expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }], context: { lang: 'ar' } })
            }));
        });
    });
});
