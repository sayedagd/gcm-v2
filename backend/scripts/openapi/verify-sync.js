#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const specPath = path.join(repoRoot, 'openapi', 'openapi.v1.json');

const requiredContracts = [
  { path: '/api/v1/auth/login', methods: ['post'] },
  { path: '/api/v1/auth/logout', methods: ['post'] },
  { path: '/api/v1/auth/sse-token', methods: ['get'] },
  { path: '/api/v1/config', methods: ['get'] },
  { path: '/api/v1/system/backup/status', methods: ['get'] },
  { path: '/api/v1/system/backup/download', methods: ['get'] },
  { path: '/api/v1/system/backup/restore', methods: ['post'] },
  { path: '/api/v1/system/backup/trigger', methods: ['post'] },
  { path: '/api/v1/companies', methods: ['get', 'post'] },
  { path: '/api/v1/companies/{id}', methods: ['delete'] },
  { path: '/api/v1/projects', methods: ['get', 'post'] },
  { path: '/api/v1/projects/{id}', methods: ['delete'] },
  { path: '/api/v1/trips', methods: ['get', 'post'] },
  { path: '/api/v1/trips/{id}', methods: ['delete'] },
  { path: '/api/v1/services', methods: ['get', 'post'] },
  { path: '/api/v1/services/{id}', methods: ['delete'] },
  { path: '/api/v1/facilities', methods: ['get', 'post'] },
  { path: '/api/v1/facilities/{id}', methods: ['delete'] },
  { path: '/api/v1/suppliers', methods: ['get', 'post'] },
  { path: '/api/v1/suppliers/{id}', methods: ['delete'] },
  { path: '/api/v1/vehicles', methods: ['get', 'post'] },
  { path: '/api/v1/vehicles/{id}', methods: ['delete'] },
  { path: '/api/v1/drivers', methods: ['get', 'post'] },
  { path: '/api/v1/drivers/{id}', methods: ['delete'] },
];

const fail = (message) => {
  console.error(`OpenAPI sync check failed: ${message}`);
  process.exit(1);
};

if (!fs.existsSync(specPath)) {
  fail(`missing spec file at ${specPath}`);
}

let spec;
try {
  spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in ${specPath}: ${error.message}`);
}

if (!spec || typeof spec !== 'object' || !spec.paths || typeof spec.paths !== 'object') {
  fail('spec does not expose a valid paths object');
}

const errorSchema = spec.components?.schemas?.ErrorResponse;
if (!errorSchema) {
  fail('ErrorResponse schema is missing from components.schemas');
}

const requiredErrorFields = ['status', 'schemaVersion', 'error', 'code', 'errorInfo'];
for (const field of requiredErrorFields) {
  if (!Array.isArray(errorSchema.required) || !errorSchema.required.includes(field)) {
    fail(`ErrorResponse missing required field: ${field}`);
  }
}

if (!errorSchema.properties?.schemaVersion) {
  fail('ErrorResponse missing properties.schemaVersion');
}

if (!errorSchema.properties?.errorInfo?.properties?.schemaVersion) {
  fail('ErrorResponse missing errorInfo.properties.schemaVersion');
}

const resolveResponse = (response) => {
  if (!response || typeof response !== 'object') return null;
  if (!response.$ref) return response;

  const ref = response.$ref;
  const prefix = '#/components/responses/';
  if (!ref.startsWith(prefix)) return null;

  const key = ref.slice(prefix.length);
  return spec.components?.responses?.[key] || null;
};

const usesErrorEnvelope = (response) => {
  const resolved = resolveResponse(response);
  if (!resolved) return false;

  const schema = resolved.content?.['application/json']?.schema;
  if (!schema || typeof schema !== 'object') return false;

  return schema.$ref === '#/components/schemas/ErrorResponse';
};

const missing = [];
for (const contract of requiredContracts) {
  const entry = spec.paths[contract.path];
  if (!entry) {
    missing.push(`${contract.path} (missing path)`);
    continue;
  }

  for (const method of contract.methods) {
    if (!entry[method]) {
      missing.push(`${contract.path} [${method.toUpperCase()}]`);
    }
  }
}

if (missing.length > 0) {
  fail(`missing required contracts:\n- ${missing.join('\n- ')}`);
}

const nonV1Paths = Object.keys(spec.paths).filter((routePath) => !routePath.startsWith('/api/v1/'));
if (nonV1Paths.length > 0) {
  fail(`found non-v1 paths in v1 spec:\n- ${nonV1Paths.join('\n- ')}`);
}

const errorEnvelopeViolations = [];
for (const [routePath, pathItem] of Object.entries(spec.paths)) {
  for (const [method, operation] of Object.entries(pathItem || {})) {
    if (!operation || typeof operation !== 'object' || !operation.responses) continue;

    for (const [statusCode, response] of Object.entries(operation.responses)) {
      if (!/^[45]\d\d$/.test(statusCode)) continue;
      if (!usesErrorEnvelope(response)) {
        errorEnvelopeViolations.push(`${method.toUpperCase()} ${routePath} [${statusCode}]`);
      }
    }
  }
}

if (errorEnvelopeViolations.length > 0) {
  fail(`non-standard error envelope responses detected:\n- ${errorEnvelopeViolations.join('\n- ')}`);
}

console.log(`OpenAPI sync check passed (${requiredContracts.length} critical contracts validated).`);
