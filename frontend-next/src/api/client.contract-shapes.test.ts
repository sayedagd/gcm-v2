import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openApiPath = path.resolve(__dirname, '../../../backend/openapi/openapi.v1.json');
const generatedTypesPath = path.resolve(__dirname, './generated/openapi.types.ts');
const openApiSpec = JSON.parse(fs.readFileSync(openApiPath, 'utf8')) as {
  paths: Record<
    string,
    Record<
      string,
      {
        responses?: Record<string, unknown>;
        requestBody?: { content?: { 'application/json'?: { schema?: { $ref?: string } } } };
      }
    >
  >;
  components: { schemas: Record<string, { properties?: Record<string, unknown>; required?: string[] }> };
};
const generatedTypesSource = fs.readFileSync(generatedTypesPath, 'utf8');

const toGeneratedComponentSchemaType = (schemaRef: string) => {
  const schemaName = schemaRef.replace('#/components/schemas/', '');
  return `components["schemas"]["${schemaName}"]`;
};

const getJsonSchemaRef = (routePath: string, method: string, statusCode: string) => {
  const operation = openApiSpec.paths?.[routePath]?.[method.toLowerCase()];
  const response = operation?.responses?.[statusCode] as
    | {
        content?: {
          'application/json'?: {
            schema?: { $ref?: string; items?: { $ref?: string }; oneOf?: Array<{ $ref?: string }> };
          };
        };
      }
    | undefined;

  const schema = response?.content?.['application/json']?.schema;
  if (!schema) return null;

  return {
    ref: schema.$ref,
    itemRef: schema.items?.$ref,
    oneOfRefs: schema.oneOf?.map((entry) => entry.$ref).filter((ref): ref is string => Boolean(ref)) ?? [],
  };
};

const getSchema = (schemaName: string) => {
  const schema = openApiSpec.components.schemas[schemaName];
  expect(schema).toBeDefined();
  return schema as { properties?: Record<string, unknown>; required?: string[] };
};

const getJsonRequestRef = (routePath: string, method: string) => {
  const operation = openApiSpec.paths?.[routePath]?.[method.toLowerCase()];
  return operation?.requestBody?.content?.['application/json']?.schema?.$ref ?? null;
};

describe('frontend consumer-driven OpenAPI shape checks', () => {
  test('auth and backup endpoints expose expected response schemas', () => {
    const loginResponse = getJsonSchemaRef('/api/v1/auth/login', 'post', '200');
    const sseTokenResponse = getJsonSchemaRef('/api/v1/auth/sse-token', 'get', '200');
    const backupStatusResponse = getJsonSchemaRef('/api/v1/system/backup/status', 'get', '200');

    expect(loginResponse?.ref).toBe('#/components/schemas/AuthResponse');
    expect(sseTokenResponse?.ref).toBe('#/components/schemas/SseTokenResponse');
    expect(backupStatusResponse?.oneOfRefs).toEqual(
      expect.arrayContaining(['#/components/schemas/BackupStatus', '#/components/schemas/BackupJobStatus']),
    );
  });

  test('companies, projects, and trips list endpoints keep array item schema contracts', () => {
    const companiesResponse = getJsonSchemaRef('/api/v1/companies', 'get', '200');
    const projectsResponse = getJsonSchemaRef('/api/v1/projects', 'get', '200');
    const tripsResponse = getJsonSchemaRef('/api/v1/trips', 'get', '200');

    expect(companiesResponse?.itemRef).toBe('#/components/schemas/Company');
    expect(projectsResponse?.itemRef).toBe('#/components/schemas/Project');
    expect(tripsResponse?.itemRef).toBe('#/components/schemas/Trip');

    expect(getSchema('Company').properties?.company_id).toBeDefined();
    expect(getSchema('Project').properties?.project_id).toBeDefined();
    expect(getSchema('Trip').properties?.trip_id).toBeDefined();
  });

  test('error envelope keeps fields required by frontend error handling', () => {
    const errorSchema = getSchema('ErrorResponse');

    expect(errorSchema.required).toEqual(expect.arrayContaining(['status', 'error', 'code', 'errorInfo']));
    expect(errorSchema.properties?.error).toBeDefined();
    expect(errorSchema.properties?.errorEn).toBeDefined();
    expect(errorSchema.properties?.errorAr).toBeDefined();
    expect(errorSchema.properties?.traceId).toBeDefined();
  });

  test('generated OpenAPI types stay compatible with backend response schema refs', () => {
    const responseChecks: Array<{ routePath: string; method: string; statusCode: string }> = [
      { routePath: '/api/v1/auth/login', method: 'post', statusCode: '200' },
      { routePath: '/api/v1/companies', method: 'get', statusCode: '200' },
      { routePath: '/api/v1/projects', method: 'get', statusCode: '200' },
      { routePath: '/api/v1/trips', method: 'get', statusCode: '200' },
      { routePath: '/api/v1/services', method: 'get', statusCode: '200' },
      { routePath: '/api/v1/facilities', method: 'get', statusCode: '200' },
    ];

    for (const check of responseChecks) {
      const schemaRef = getJsonSchemaRef(check.routePath, check.method, check.statusCode);
      const expectedItemType = schemaRef?.itemRef ? `${toGeneratedComponentSchemaType(schemaRef.itemRef)}[]` : null;
      const expectedType = schemaRef?.ref ? toGeneratedComponentSchemaType(schemaRef.ref) : expectedItemType;
      const expectedOneOfTypes = (schemaRef?.oneOfRefs ?? []).map((ref) => toGeneratedComponentSchemaType(ref));

      expect(generatedTypesSource).toContain(`"${check.routePath}":`);
      if (expectedType) {
        expect(generatedTypesSource).toContain(expectedType);
      }
      for (const unionType of expectedOneOfTypes) {
        expect(generatedTypesSource).toContain(unionType);
      }
    }
  });

  test('generated OpenAPI types stay compatible with backend request schema refs', () => {
    const requestChecks: Array<{ routePath: string; method: string }> = [
      { routePath: '/api/v1/auth/login', method: 'post' },
      { routePath: '/api/v1/companies', method: 'post' },
      { routePath: '/api/v1/projects', method: 'post' },
      { routePath: '/api/v1/trips', method: 'post' },
      { routePath: '/api/v1/services', method: 'post' },
      { routePath: '/api/v1/facilities', method: 'post' },
      { routePath: '/api/v1/users', method: 'post' },
    ];

    for (const check of requestChecks) {
      const requestRef = getJsonRequestRef(check.routePath, check.method);
      if (!requestRef) {
        continue;
      }

      expect(generatedTypesSource).toContain(`"${check.routePath}":`);
      expect(generatedTypesSource).toContain(toGeneratedComponentSchemaType(requestRef));
    }
  });
});
