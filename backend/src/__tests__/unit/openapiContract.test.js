const fs = require('fs');
const path = require('path');

describe('OpenAPI v1 contract', () => {
  let spec;

  beforeAll(() => {
    const specPath = path.join(__dirname, '..', '..', '..', 'openapi', 'openapi.v1.json');
    spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  });

  test('documents auth login/logout/sse-token endpoints', () => {
    expect(spec.paths['/api/v1/auth/login']?.post).toBeDefined();
    expect(spec.paths['/api/v1/auth/logout']?.post).toBeDefined();
    expect(spec.paths['/api/v1/auth/sse-token']?.get).toBeDefined();
    expect(spec.paths['/api/v1/system/metrics']?.get).toBeDefined();
  });

  test('login request uses email/password contract', () => {
    const loginSchema = spec.components.schemas.LoginRequest;

    expect(loginSchema.required).toEqual(expect.arrayContaining(['email', 'password']));
    expect(loginSchema.properties.email.type).toBe('string');
  });

  test('canonical error envelope schema keeps backward compatibility fields', () => {
    const errorSchema = spec.components.schemas.ErrorResponse;

    expect(errorSchema.required).toEqual(expect.arrayContaining(['status', 'error', 'code', 'errorInfo']));
    expect(errorSchema.properties.errorInfo).toBeDefined();
    expect(errorSchema.properties.errorEn).toBeDefined();
    expect(errorSchema.properties.errorAr).toBeDefined();
    expect(errorSchema.properties.traceId).toBeDefined();
    expect(errorSchema.properties.errorInfo.properties.traceId).toBeDefined();
  });
});
