# Backup Operations Runbook

## Ownership

- Primary owner: Platform/DevOps lead
- Secondary owner: Backend lead
- Last reviewed: 2026-06-09

## Scope

Operational procedure for backup trigger, status monitoring, artifact retention, and handoff to restore drill flow.

## Preconditions

- API runtime is healthy and reachable.
- Scheduler worker is running for queued backup job processing.
- Authenticated admin session is available.
- Backup storage target is configured for environment (`local` in non-prod, object storage in production).

## Execution Steps

1. Trigger backup with `POST /api/v1/system/backup/trigger`.
2. Track status with `GET /api/v1/system/backup/status?job_id={jobId}` until `success`.
3. Download artifact with `GET /api/v1/system/backup/download?format=sql`.
4. Record artifact metadata (file name, bytes, generation timestamp, source trigger).
5. Link artifact metadata in release/incident evidence.

## Failure Handling

- If trigger fails with `401/403`: validate admin auth and CSRF context.
- If status is `failed`: capture `errorMessage`, open incident, and assign owner.
- If worker backlog is detected: follow `background-job-retry-policy.md` and prioritize backup jobs.

## Evidence

- Automated drill output: `docs/evidence/restore-drill-latest.json`.
- Manual incident references: include backup `jobId`, `artifactId`, and trigger source.
