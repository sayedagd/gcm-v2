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
- [ ] `frontend-next`: run the live smoke workflow against the deployed URL using `frontend-smoke.yml`
- [ ] Infrastructure drift review completed for target environment:
  - [ ] Run `terraform plan` from `backend/infra/terraform` with target env vars/tfvars.
  - [ ] Attach plan summary to release evidence (`create/update/delete/no-op` counts).
  - [ ] Confirm no unapproved drift in compute/database/redis/object storage/observability.
  - [ ] Record approver from Platform/DevOps.

## Stage 1 - Staged Deployment

- [ ] Deploy backend to staging with `/api/v1/*` and legacy alias support enabled.
- [ ] Deploy frontend to staging with write boundary (`/api/write/*`) unchanged.
- [ ] Execute restore drill in staging against runbook:
  - [ ] Runbook: `backend/docs/restore-drill-runbook.md`
  - [ ] Target RTO: less than or equal to 60 minutes
  - [ ] Target RPO: less than or equal to 15 minutes
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

## KPI Assessment - Backup and Restore (Important)

Target:

- RTO less than or equal to `60 minutes`
- RPO less than or equal to `15 minutes`
- Scope: timed staging restore drill with integrity checklist

Evidence available:

- Stage 1 restore drill checklist items exist, but execution checkboxes remain incomplete in this document.
- No committed timed-run result artifact (start/end times, validated data recovery points) is linked.

Result:

- FAIL for KPI acceptance criteria (timed staging restore evidence not yet committed).

## Infrastructure Drift Review Process

1. Generate a drift snapshot before staging deploy (`terraform plan` using current branch IaC and target workspace/state).
2. Compare plan output with the last approved production baseline.
3. If drift is expected, link change request/approval and proceed.
4. If drift is unexpected, stop rollout and open infra incident or remediation ticket.
5. Re-run drift snapshot after rollout and store both snapshots in release evidence.
