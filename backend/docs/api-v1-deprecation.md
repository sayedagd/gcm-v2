# Legacy API Deprecation and v1 Cutoff

## Scope

Legacy API paths under `/api/*` that are not prefixed with `/api/v1/*` are deprecated.

## Successor

Use `/api/v1/*` for all integrations and client calls.

## Cutoff Policy

- Sunset date configured by `LEGACY_API_SUNSET`.
- Enforcement toggle configured by `LEGACY_API_ENFORCE_AFTER_SUNSET`.
- When enforcement is enabled and sunset date has passed, legacy routes return `410 Gone`.

## Response Headers for Legacy Calls

- `Deprecation: true`
- `Sunset: <http-date>`
- `Link: </api/v1>; rel="successor-version", <deprecation-doc-url>; rel="deprecation"`

## Migration Checklist

1. Replace all legacy `/api/*` calls with `/api/v1/*`.
2. Confirm OpenAPI contract checks pass in CI.
3. Validate frontend and integration tests only hit `/api/v1/*` endpoints.
4. Enable enforcement after all clients are migrated.
