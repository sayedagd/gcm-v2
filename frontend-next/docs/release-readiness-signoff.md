# Release Readiness Sign-Off

## Security Sign-Off

Status: APPROVED

Scope:

- Auth model: backend-issued HttpOnly `gcm_jwt` session cookie is canonical.
- Password storage: hashed credential verification path validated; legacy migration coverage retained.
- Token/cookie handling: logout clears backend and app auth cookies; expired/invalid sessions are rejected and cleared.

Evidence:

- `src/api/client.auth-flow.test.ts` verifies login -> protected -> logout -> 401 flow.
- `src/proxy.test.ts` verifies logout cookie clearing, session expiry handling, and route protection.
- Backend unit tests validate auth middleware and login password migration paths.

## Parity Sign-Off

Status: APPROVED

Scope:

- Public parity: `/landing`, `/store`, and `/home -> /landing` behavior validated.
- Session parity: login/logout/session-expiry journey remains stable under v1 endpoint normalization.
- Role parity: client/subcontractor/driver path access remains role-correct.

Evidence:

- `src/e2e/coreJourneys.regression.test.ts` validates core journey continuity.
- `src/proxy.test.ts` validates public route reachability and auth redirects.
- `src/components/layout/PublicLinks.parity.test.tsx` validates canonical public navbar/footer routes.
- `src/app/home/page.test.ts` validates canonical home redirect behavior.

## Architecture Sign-Off

Status: APPROVED

Scope:

- Frontend remains API-boundary only (no direct DB coupling).
- Critical writes are routed through Next write boundary (`/api/write/*`).
- Versioned read contracts use `/api/v1/*` and OpenAPI sync gate validates backend contract coverage.

Evidence:

- `scripts/check-api-boundary.mjs` enforces no DB dependency/import or SQL coupling in frontend source.
- `src/lib/server/writeProxy.ts` preserves canonical Next write boundary to backend v1 endpoints.
- `backend/scripts/openapi/verify-sync.js` and `backend/package.json` `check:openapi-sync`/`ci:check` scripts enforce OpenAPI contract sync.

## Production Rollout Checklist

Status: APPROVED

Reference:

- `docs/production-rollout-checklist.md`
