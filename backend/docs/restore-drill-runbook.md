# Staging Restore Drill Runbook

## Ownership

- Primary owner: Platform/DevOps lead
- Secondary owner: Backend lead
- Last reviewed: 2026-06-09

## Objective

Validate disaster recovery readiness with measurable RTO and RPO outcomes.

## Targets

- RTO target: less than or equal to 60 minutes.
- RPO target: less than or equal to 15 minutes.

## Preconditions

- Staging database and API are healthy before drill start.
- Latest backup artifact is present and downloadable.
- Non-production credentials and isolated staging environment are in use.
- Incident channel and drill owner are assigned.

## Drill Steps

1. Capture start timestamp and declare drill start.
2. Trigger non-blocking backup job and wait for success:
   - call `POST /api/v1/system/backup/trigger`
   - poll `GET /api/v1/system/backup/status?job_id={jobId}` until status is `success`
3. Download the backup artifact from `GET /api/v1/system/backup/download`.
4. Simulate data-loss scenario in staging dataset.
5. Restore from backup through `POST /api/v1/system/backup/restore`.
6. Run post-restore verification checks:
   - auth login success path
   - projects, companies, trips list endpoints
   - backup status endpoint returns expected metadata
7. Capture end timestamp and compute RTO.
8. Compare backup generation timestamp to incident timestamp and compute RPO.

## Acceptance Criteria

- RTO is less than or equal to 60 minutes.
- RPO is less than or equal to 15 minutes.
- No critical API contract regressions after restore.

## Evidence to Record

- Drill date and owners.
- Start/end timestamps and computed RTO.
- Backup generation time and computed RPO.
- Verification test summary and defects found.
- Follow-up remediation tasks with owners and due dates.

## Automation

Use the scripted drill runner to produce machine-readable evidence:

- Command: `npm run drill:restore`
- Required env vars:
   - `DRILL_BASE_URL` (for example `http://localhost:8080`)
   - `DRILL_AUTH_COOKIE` (valid authenticated cookie header value)
   - `DRILL_CSRF_TOKEN` (required when cookie-authenticated unsafe methods are protected by CSRF)
- Optional env vars:
   - `DRILL_POLL_MS` (default `3000`)
   - `DRILL_TIMEOUT_MS` (default `300000`)
   - `DRILL_OUTPUT_PATH` (default `backend/docs/evidence/restore-drill-latest.json`)

The script output contains:

- start/end timestamps
- computed RTO/RPO minutes
- pass/fail against targets
- backup/restore endpoint result snapshots
