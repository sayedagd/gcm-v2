# Typed API SDK Migration Checklist

Use this checklist to migrate one domain module at a time from direct API client usage to the typed SDK layer.

## Preconditions

- [ ] Run `npm run check:api-types` so `src/api/generated/openapi.types.ts` is fresh.
- [ ] Confirm the backend endpoint is present in `backend/openapi/openapi.v1.json`.
- [ ] Confirm request and response schemas are documented for all statuses used by the module.

## Per-Domain Migration Steps

- [ ] Create or extend typed aliases in `src/api/sdk.ts` using `paths[...]` from generated OpenAPI types.
- [ ] Add typed SDK method(s) for the target domain endpoint(s).
- [ ] Replace direct `createApiClient()` calls in the domain module with `createTypedApiSdk()` where applicable.
- [ ] Replace broad payload arguments with endpoint-specific typed payloads.
- [ ] Keep path policy intact (`/api/v1/*` and `/api/write/*` only).

## Contract and Runtime Safety

- [ ] Add or update tests in `src/api/client.contract-shapes.test.ts` for request/response schema refs.
- [ ] Add or update domain behavior tests for happy path and non-happy path handling.
- [ ] Verify runtime error behavior still returns `ApiError` with envelope fields (`error`, `errorEn`, `errorAr`, `code`, `traceId`).

## Validation Gates (Must Pass Before Merge)

- [ ] `npm run check:type-strict`
- [ ] `npm run lint`
- [ ] Run focused tests for touched modules and API boundaries.
- [ ] `npm run build`

## Rollout Strategy

- [ ] Migrate one domain at a time (recommended order): auth/config, companies/projects, trips/services, suppliers/facilities, fleet.
- [ ] Keep each migration in a separate PR where possible.
- [ ] After each domain migration, run smoke checks for impacted screens and write routes.

## Completion Criteria

- [ ] Target domain compiles against generated OpenAPI contract types.
- [ ] No new non-v1 endpoint usage is introduced.
- [ ] Contract compatibility tests and build gates pass.
