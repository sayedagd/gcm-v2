# Production Rollout Checklist

## Stage 0 - Pre-Deploy Verification

- [ ] `frontend-next`: `npm run check:type-strict`
- [ ] `frontend-next`: `npm run test:run`
- [ ] `frontend-next`: `npm run test:e2e-regression`
- [ ] `frontend-next`: `npm run build`
- [ ] `backend`: `npm run ci:check`
- [ ] `backend`: `npm run check:openapi-sync`
- [ ] `frontend-next`: `npm run smoke:split` with target env vars
- [ ] `frontend-next`: `npm run smoke:rate-limit` with target env vars

## Stage 1 - Staged Deployment

- [ ] Deploy backend to staging with `/api/v1/*` and legacy alias support enabled.
- [ ] Deploy frontend to staging with write boundary (`/api/write/*`) unchanged.
- [ ] Run smoke checks on staging:
  - [ ] auth login invalid returns expected auth envelope
  - [ ] protected read/write endpoints return 401 unauthenticated
  - [ ] public `/landing` and `/store` remain reachable
- [ ] Run baseline performance capture on staging:
  - [ ] `backend`: `npm run perf:baseline`
  - [ ] Update `frontend-next/docs/baseline-metrics.json`
  - [ ] Update `frontend-next/docs/post-remediation-benchmark.md`

## Stage 2 - Canary Release (10%)

- [ ] Deploy frontend canary build to 10% traffic.
- [ ] Monitor for 30-60 minutes:
  - [ ] auth 401/403 spike
  - [ ] 422 validation failure deltas
  - [ ] 429 rate-limit error trends
  - [ ] 5xx rates on auth/system/write routes
- [ ] Confirm no regression in core journeys (login/dashboard CRUD/public routes).

## Stage 3 - Full Rollout (100%)

- [ ] Promote canary to 100% traffic.
- [ ] Re-run split smoke and rate-limit smoke against production.
- [ ] Capture post-rollout perf snapshot and compare against thresholds.
- [ ] Mark release sign-off document as APPROVED for all sections.

## Rollback Plan

## Rollback Triggers

- [ ] Sustained 5xx increase on critical auth/system/write endpoints.
- [ ] Broken login/session lifecycle in production.
- [ ] Critical CRUD mutation failure rate increase.
- [ ] Severe degradation against benchmark thresholds.

## Rollback Actions

1. Re-route traffic to previous stable frontend deployment.
2. Revert backend deployment to previous release while preserving DB schema compatibility.
3. Keep legacy endpoint aliases enabled during rollback window.
4. Run smoke checks (`smoke:split`, auth/login, protected reads/writes) on rolled back version.
5. Open incident log with root-cause summary and remediation owner.

## Rollback Exit Criteria

- [ ] Auth/session flow restored and stable.
- [ ] Core CRUD routes return expected success/error contracts.
- [ ] Error-rate and latency return within baseline thresholds.
