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

  test('high-risk auth contracts define operation ids and response envelopes', () => {
    const loginPost = spec.paths['/api/v1/auth/login']?.post;
    const logoutPost = spec.paths['/api/v1/auth/logout']?.post;
    const sseTokenGet = spec.paths['/api/v1/auth/sse-token']?.get;

    expect(loginPost).toBeDefined();
    expect(logoutPost).toBeDefined();
    expect(sseTokenGet).toBeDefined();
    expect(loginPost?.requestBody).toBeDefined();
    expect(loginPost?.responses?.['200']).toBeDefined();
    const loginClientError =
      loginPost?.responses?.['400'] ||
      loginPost?.responses?.['401'] ||
      loginPost?.responses?.['403'] ||
      loginPost?.responses?.['422'];
    expect(loginClientError).toBeDefined();
    expect(logoutPost?.responses?.['200']).toBeDefined();
    expect(sseTokenGet?.responses?.['200']).toBeDefined();
  });

  test('high-risk trips lifecycle contracts stay documented for list/create/delete', () => {
    const tripsPath = spec.paths['/api/v1/trips'];
    const tripByIdPath = spec.paths['/api/v1/trips/{id}'];

    expect(tripsPath?.get).toBeDefined();
    expect(tripsPath?.post).toBeDefined();
    expect(tripByIdPath?.delete).toBeDefined();
    expect(tripsPath?.post?.requestBody).toBeDefined();
    expect(tripsPath?.post?.responses?.['200']).toBeDefined();
    expect(tripByIdPath?.delete?.responses?.['200']).toBeDefined();
  });

  test('high-risk backup contracts include status/download/restore endpoints', () => {
    const backupStatus = spec.paths['/api/v1/system/backup/status']?.get;
    const backupDownload = spec.paths['/api/v1/system/backup/download']?.get;
    const backupRestore = spec.paths['/api/v1/system/backup/restore']?.post;
    const backupTrigger = spec.paths['/api/v1/system/backup/trigger']?.post;

    expect(backupStatus).toBeDefined();
    expect(backupDownload).toBeDefined();
    expect(backupRestore).toBeDefined();
    expect(backupTrigger).toBeDefined();
    expect(backupStatus?.responses?.['200']).toBeDefined();
    expect(backupDownload?.responses?.['200']).toBeDefined();
    expect(backupRestore?.responses?.['200']).toBeDefined();
    expect(backupTrigger?.responses?.['202']).toBeDefined();
    expect(backupTrigger?.responses?.['202']?.content?.['application/json']?.schema?.$ref).toBe(
      '#/components/schemas/BackupTriggerAccepted'
    );
  });

  test('high-risk supplier and facility contracts stay documented for list/create/delete', () => {
    const suppliersPath = spec.paths['/api/v1/suppliers'];
    const supplierByIdPath = spec.paths['/api/v1/suppliers/{id}'];
    const facilitiesPath = spec.paths['/api/v1/facilities'];
    const facilityByIdPath = spec.paths['/api/v1/facilities/{id}'];

    expect(suppliersPath?.get).toBeDefined();
    expect(suppliersPath?.post).toBeDefined();
    expect(supplierByIdPath?.delete).toBeDefined();
    expect(facilitiesPath?.get).toBeDefined();
    expect(facilitiesPath?.post).toBeDefined();
    expect(facilityByIdPath?.delete).toBeDefined();

    expect(suppliersPath?.post?.requestBody).toBeDefined();
    expect(suppliersPath?.post?.responses?.['200']).toBeDefined();
    expect(supplierByIdPath?.delete?.responses?.['200']).toBeDefined();
    expect(facilitiesPath?.post?.requestBody).toBeDefined();
    expect(facilitiesPath?.post?.responses?.['200']).toBeDefined();
    expect(facilityByIdPath?.delete?.responses?.['200']).toBeDefined();
  });

  test('login request uses email/password contract', () => {
    const loginSchema = spec.components.schemas.LoginRequest;

    expect(loginSchema.required).toEqual(expect.arrayContaining(['email', 'password']));
    expect(loginSchema.properties.email.type).toBe('string');
  });

  test('canonical error envelope schema keeps backward compatibility fields', () => {
    const errorSchema = spec.components.schemas.ErrorResponse;

    expect(errorSchema.required).toEqual(expect.arrayContaining(['status', 'schemaVersion', 'error', 'code', 'errorInfo']));
    expect(errorSchema.properties.schemaVersion).toBeDefined();
    expect(errorSchema.properties.errorInfo).toBeDefined();
    expect(errorSchema.properties.errorEn).toBeDefined();
    expect(errorSchema.properties.errorAr).toBeDefined();
    expect(errorSchema.properties.traceId).toBeDefined();
    expect(errorSchema.properties.errorInfo.properties.schemaVersion).toBeDefined();
    expect(errorSchema.properties.errorInfo.properties.traceId).toBeDefined();
  });

  test('all documented 4xx/5xx responses use canonical ErrorResponse envelope', () => {
    const resolveResponse = (response) => {
      if (!response || typeof response !== 'object') return null;
      if (!response.$ref) return response;

      const prefix = '#/components/responses/';
      if (!response.$ref.startsWith(prefix)) return null;

      const key = response.$ref.slice(prefix.length);
      return spec.components.responses[key] || null;
    };

    const violations = [];

    for (const [routePath, pathItem] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem || {})) {
        if (!operation || typeof operation !== 'object') continue;
        const responses = operation.responses || {};

        for (const [statusCode, response] of Object.entries(responses)) {
          if (!/^[45]\d\d$/.test(statusCode)) continue;

          const resolved = resolveResponse(response);
          const schemaRef = resolved?.content?.['application/json']?.schema?.$ref;
          if (schemaRef !== '#/components/schemas/ErrorResponse') {
            violations.push(`${method.toUpperCase()} ${routePath} [${statusCode}]`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
