import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createApiClient } from '@/api/client';

describe('CRUD lifecycle flows', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
      status: 200,
      statusText: 'OK',
    } as unknown as Response);
  });

  test('companies flow: create, edit, delete', async () => {
    const client = createApiClient('');

    await client.upsertCompany({ company_id: 'C-1', company_name: 'Alpha Co' });
    await client.upsertCompany({ company_id: 'C-1', company_name: 'Alpha Co Updated' });
    await client.deleteCompany('C-1');

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    expect(calls).toHaveLength(3);

    expect(calls[0]?.[0]).toBe('/api/write/companies');
    expect((calls[0]?.[1] as RequestInit)?.method).toBe('POST');

    expect(calls[1]?.[0]).toBe('/api/write/companies');
    expect((calls[1]?.[1] as RequestInit)?.method).toBe('POST');

    expect(calls[2]?.[0]).toBe('/api/write/companies/C-1');
    expect((calls[2]?.[1] as RequestInit)?.method).toBe('DELETE');
  });

  test('projects flow: create, edit, delete', async () => {
    const client = createApiClient('');

    await client.upsertProject({ project_id: 'P-1', project_name: 'Project One' });
    await client.upsertProject({ project_id: 'P-1', project_name: 'Project One Updated' });
    await client.deleteProject('P-1');

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    expect(calls).toHaveLength(3);

    expect(calls[0]?.[0]).toBe('/api/write/projects');
    expect((calls[0]?.[1] as RequestInit)?.method).toBe('POST');

    expect(calls[1]?.[0]).toBe('/api/write/projects');
    expect((calls[1]?.[1] as RequestInit)?.method).toBe('POST');

    expect(calls[2]?.[0]).toBe('/api/write/projects/P-1');
    expect((calls[2]?.[1] as RequestInit)?.method).toBe('DELETE');
  });

  test('trips flow: create, edit, delete', async () => {
    const client = createApiClient('');

    await client.upsertTrip({ trip_id: 'T-1', project_id: 'P-1', status: 'REQUESTED' });
    await client.upsertTrip({ trip_id: 'T-1', project_id: 'P-1', status: 'ASSIGNED' });
    await client.deleteTrip('T-1');

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    expect(calls).toHaveLength(3);

    expect(calls[0]?.[0]).toBe('/api/write/trips');
    expect((calls[0]?.[1] as RequestInit)?.method).toBe('POST');

    expect(calls[1]?.[0]).toBe('/api/write/trips');
    expect((calls[1]?.[1] as RequestInit)?.method).toBe('POST');

    expect(calls[2]?.[0]).toBe('/api/write/trips/T-1');
    expect((calls[2]?.[1] as RequestInit)?.method).toBe('DELETE');
  });

  test('critical non-core entities route writes through server proxy', async () => {
    const client = createApiClient('');

    await client.upsertService({ service_id: 'S-1', service_name: 'Drain Service' });
    await client.deleteService('S-1');
    await client.upsertVehicle({ vehicle_id: 'V-1', plate_number: 'ABC-123' });
    await client.deleteVehicle('V-1');
    await client.upsertDriver({ driver_id: 'D-1', name: 'Driver One' });
    await client.deleteDriver('D-1');
    await client.upsertSupplier({ supplier_id: 'SUP-1', name: 'Supplier One' });
    await client.deleteSupplier('SUP-1');
    await client.upsertFacility({ facility_id: 'F-1', name: 'Facility One' });
    await client.deleteFacility('F-1');

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    expect(calls).toHaveLength(10);

    expect(calls[0]?.[0]).toBe('/api/write/services');
    expect(calls[1]?.[0]).toBe('/api/write/services/S-1');
    expect(calls[2]?.[0]).toBe('/api/write/vehicles');
    expect(calls[3]?.[0]).toBe('/api/write/vehicles/V-1');
    expect(calls[4]?.[0]).toBe('/api/write/drivers');
    expect(calls[5]?.[0]).toBe('/api/write/drivers/D-1');
    expect(calls[6]?.[0]).toBe('/api/write/suppliers');
    expect(calls[7]?.[0]).toBe('/api/write/suppliers/SUP-1');
    expect(calls[8]?.[0]).toBe('/api/write/facilities');
    expect(calls[9]?.[0]).toBe('/api/write/facilities/F-1');
  });
});
