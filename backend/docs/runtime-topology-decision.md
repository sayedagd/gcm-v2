# Runtime Topology Decision

## Decision

Choose Option A: always-on API service plus a dedicated worker service.

Status: finalized and approved for Phase 3 execution.

## Why This Topology

- It aligns with current SSE and long-lived connection patterns already present in the API.
- It removes heavy jobs from the request path without forcing a full serverless redesign.
- It scales independently by concern: API for request throughput, worker for background throughput.
- It reduces risk because it is an incremental evolution from the current deployment model.

## Service Responsibilities

### API Service

- Handle synchronous HTTP request/response flows.
- Serve SSE streams and realtime event delivery contracts.
- Validate inputs and enqueue long-running work units.
- Stay stateless with externalized coordination and storage.

### Worker Service

- Process OCR, backup, WhatsApp automation, and other long-running jobs.
- Own retry and backoff behavior for transient failures.
- Emit progress and completion events consumed by API/SSE layer.
- Isolate resource-heavy jobs from latency-sensitive API traffic.

## Runtime Role Matrix (Authoritative)

| Runtime | Entrypoint(s) | Allowed Responsibilities | Forbidden Responsibilities |
| --- | --- | --- | --- |
| API role | `backend/app.js` with `PROCESS_ROLE=api` | HTTP APIs, auth/session, SSE delivery, request validation, queue/job enqueue, lightweight startup init | Long-running polling loops, OCR execution, WhatsApp job execution, backup scheduler ownership |
| Worker role | `backend/src/workers/ocr.worker.js`, `backend/src/workers/scheduler.worker.js`, `backend/src/workers/whatsapp.worker.js` with `PROCESS_ROLE=worker` | OCR job claim/process/complete, backup scheduler and pending backup processing, WhatsApp queue processing, retry/backoff/dead-letter flow | Public API serving, UI/session endpoints, request-path business mutations |

## Module-to-Runtime Responsibility Mapping

### API-owned (request path)

- Route handling and auth/session endpoints under `/api/v1/*`.
- Job submission endpoints:
  - OCR submit/status endpoints (`/api/v1/ai/ocr/vision*`).
  - Backup trigger/status/download/restore endpoints (`/api/v1/system/backup/*`).
- Realtime fanout and SSE token issuance.

### Worker-owned (async execution path)

- OCR execution and callback delivery from `ocr_jobs`.
- Backup job polling and artifact generation from backup job state.
- WhatsApp queue consumption and outbound delivery.

### Shared dependencies (both roles)

- Database connectivity and durable job state.
- Broker/queue infrastructure used for handoff and fanout.
- Unified logging and traceability conventions.

## Runtime Configuration Contract

- `PROCESS_ROLE=api`
  - `ENABLE_SERVERLESS_STARTUP_JOBS` must remain `false` in production.
  - `ENABLE_IN_PROCESS_JOBS` must remain `false` in production.
- `PROCESS_ROLE=worker`
  - Worker loops are enabled and own heavy/background processing.
  - Poll intervals are controlled by role-specific env vars (`OCR_WORKER_POLL_MS`, `BACKUP_WORKER_POLL_MS`, `WHATSAPP_WORKER_POLL_MS`).

## Platform Requirements

- Shared queue or broker for API-to-worker handoff.
- Shared durable storage for job state and retry metadata.
- Independent autoscaling policies for API and worker runtimes.
- Health checks split by role: API liveness/readiness and worker queue-consumer readiness.

## Rollout Plan

1. Keep API as system-of-record entrypoint and enqueue asynchronous jobs.
2. Route OCR workloads to worker first and verify parity with existing behavior.
3. Migrate backup and WhatsApp flows to worker queue consumers.
4. Remove in-process cron and long-running tasks from API runtime.
5. Enforce deployment guardrail: API release cannot include new long-running task logic.

## Deployment Acceptance Checklist

- API deployment manifest pins `PROCESS_ROLE=api`.
- Worker deployment manifests pin `PROCESS_ROLE=worker` and run dedicated worker entrypoints.
- Health checks are role-specific (API readiness vs worker consumer readiness).
- Incident runbooks include API-only degrade mode, worker backlog, and broker outage handling.

## Exit Criteria

- API p95 remains stable during worker job spikes.
- Worker restart does not lose in-flight job state.
- No critical business workflow depends on in-process API background execution.
- Incident runbook covers API-only, worker-only, and broker outage scenarios.
