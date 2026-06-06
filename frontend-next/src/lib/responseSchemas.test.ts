import { describe, expect, test } from 'vitest';
import { validateCriticalApiResponse } from '@/lib/responseSchemas';

describe('critical response schemas', () => {
  test('accepts valid companies payload', () => {
    const payload = [{ company_id: 'C-1', company_name: 'Alpha' }];
    expect(validateCriticalApiResponse('/api/v1/companies', payload)).toEqual(payload);
  });

  test('rejects invalid projects payload', () => {
    expect(() => validateCriticalApiResponse('/api/v1/projects', [{ project_name: 'Missing id' }])).toThrow(
      'missing project_id',
    );
  });

  test('passes through non-critical endpoints', () => {
    const payload = { ok: true };
    expect(validateCriticalApiResponse('/api/health', payload)).toEqual(payload);
  });
});
