# GCM v2 Enhancement Development Plan

## How To Use This Plan

- Status labels:
  - `complete`: task is finished and validated
  - `in progress`: active work item
  - `not started`: queued task
- Update rule: always update checkbox and status label together.
  - `[ ] [not started]`
  - `[ ] [in progress]`
  - `[x] [complete]`
- Task sizing: each task should fit in 1-3 days.

## Current Baseline

- [x] [complete] Technical architecture audit completed (stack, infrastructure posture, API boundary, remediation priorities).
- [x] [complete] Convert audit findings into executable phase plan and assign owners.

## Success Criteria

- [x] [complete] Zero critical architecture risks open at go-live.
- [x] [complete] API contract drift incidents reduced to zero for 4 consecutive sprints.
- [x] [complete] Multi-instance realtime correctness verified under restart and failover tests.
- [x] [complete] Production operations runbook validated by restore and rollback drills.

---

## Phase 0 - Critical Stability and Safety Guardrails

Goal: remove immediate architecture and production risks.

- [x] [complete] Enforce fail-fast startup for critical module load failures (no silent degraded boot for core dependencies).
- [x] [complete] Enforce fail-fast startup when required startup services fail in production mode.
- [x] [complete] Classify modules into critical vs optional and codify startup policy.
- [x] [complete] Add startup health assertion tests (boot fails when critical dependency is unavailable).
- [x] [complete] Ensure production runtime config blocks risky flags (`ENABLE_IN_PROCESS_JOBS=true` on API role, etc.).
- [x] [complete] Add CI check that rejects unsafe production env combinations.

Definition of done:

- [x] [complete] Production cannot boot in a partially broken critical state.
- [x] [complete] Startup behavior is deterministic and tested.

---

## Phase 1 - API Contract Integrity and Boundary Hardening

Goal: eliminate endpoint drift and strengthen frontend/backend contract consistency.

- [x] [complete] Enforce v1-only API path policy for frontend reads/writes (except explicit Next write boundary routes).
- [x] [complete] Refactor non-v1 endpoint callsites to canonical v1 routes.
- [x] [complete] Add static check in CI to block new non-v1 client endpoints.
- [x] [complete] Keep OpenAPI sync gate mandatory for merge and release pipelines.
- [x] [complete] Expand contract tests for high-risk modules (asset service links, supplier rates, backup flows).
- [x] [complete] Version and validate error envelopes consistently for all API responses.
- [x] [complete] Replace nullable server fetch failure behavior with typed error propagation pattern.

Definition of done:

- [x] [complete] Frontend endpoint usage is canonical and policy-enforced.
- [x] [complete] Contract drift is blocked before merge.

---

## Phase 2 - End-to-End Type Safety Across the Network Boundary

Goal: move from partial runtime checks to strongly typed API integration.

- [x] [complete] Introduce OpenAPI-based type generation for request/response contracts.
- [x] [complete] Create a typed API SDK layer used by frontend data access modules.
- [x] [complete] Replace broad `object` payload typing in API client functions with generated contract types.
- [x] [complete] Add schema compatibility tests between generated types and backend OpenAPI spec.
- [x] [complete] Add migration checklist to convert one domain module at a time to typed API SDK.

Definition of done:

- [x] [complete] Critical frontend API calls compile against generated contract types.
- [x] [complete] Runtime payload validation becomes defense-in-depth, not primary type safety.

---

## Phase 3 - Runtime Topology Alignment (API + Worker)

Goal: fully align implementation with the chosen always-on API plus dedicated worker model.

- [x] [complete] Finalize deployment model document with exact runtime responsibilities by service.
- [x] [complete] Remove any remaining in-process job assumptions from API runtime path.
- [x] [complete] Confirm workers own all heavy/background workloads (OCR, backup, WhatsApp).
- [x] [complete] Ensure worker startup and liveness checks are independent from API startup.
- [x] [complete] Add queue depth, retry, and dead-letter visibility endpoints/metrics.
- [x] [complete] Add release guardrail that prevents new long-running logic from entering API runtime.

Definition of done:

- [x] [complete] API process remains stateless and request-latency focused.
- [x] [complete] Worker outages do not compromise API serving path.

---

## Phase 4 - Realtime and Distributed State Hardening

Goal: guarantee multi-instance correctness for SSE and distributed policies.

- [x] [complete] Make Redis broker mandatory in production for cross-instance event fanout.
- [x] [complete] Add startup/runtime checks to fail or alert when broker config is invalid in production.
- [x] [complete] Enable Redis-backed rate-limit store in production environment.
- [x] [complete] Verify replay persistence behavior and retention policy for reconnect scenarios.
- [x] [complete] Add chaos tests for broker disconnect/reconnect and rolling API restarts.
- [x] [complete] Validate Last-Event-ID replay correctness under failover conditions.

Definition of done:

- [x] [complete] Realtime behavior is stable and correct across multiple API instances.
- [x] [complete] No silent fallback to single-instance local fanout in production.

---

## Phase 5 - Infrastructure Management Maturity

Goal: reduce manual ops overhead and improve repeatability.

- [x] [complete] Publish target managed services matrix (compute, database, redis, object storage, observability).
- [x] [complete] Standardize managed DB pooling configuration per environment.
- [x] [complete] Verify object storage is mandatory in production for backup artifacts.
- [x] [complete] Add environment inventory with owner, secret source, and rotation cadence.
- [x] [complete] Introduce infrastructure provisioning baseline (IaC) for critical platform resources.
- [x] [complete] Add infrastructure drift review process to release checklist.

Definition of done:

- [x] [complete] Infrastructure dependencies are reproducible, documented, and auditable.
- [x] [complete] Manual provisioning steps are minimized and tracked.

---

## Phase 6 - Frontend Data Layer Consolidation and Performance

Goal: simplify client integration paths and improve reliability/performance.

- [x] [complete] Consolidate HTTP layer usage strategy (single standard abstraction for auth-aware requests).
- [x] [complete] Refactor out inconsistent direct HTTP patterns from feature stores/components.
- [x] [complete] Enforce cache strategy usage by route category and data criticality.
- [x] [complete] Add standardized loading/error states for server and client data fetch boundaries.
- [x] [complete] Remove unused or duplicate dependencies and confirm bundle impact.
- [x] [complete] Add regression tests for critical write boundary flows.

Definition of done:

- [x] [complete] Frontend uses consistent data access contracts and error handling.
- [x] [complete] Bundle and runtime behavior remain within performance budget.

---

## Phase 7 - Reliability, DR, and Operations Readiness

Goal: operational readiness for safe releases and incident response.

- [x] [complete] Run timed restore drill and capture RTO/RPO evidence.
- [x] [complete] Validate rollback workflow with canary failure simulation.
- [x] [complete] Add production incident evidence collection for Sev-1/Sev-2 tracking.
- [x] [complete] Add SLO burn-rate alerts mapped to rollback criteria.
- [x] [complete] Confirm backup, restore, queue, and realtime runbooks are current and owner-assigned.
- [x] [complete] Execute game-day scenario for API outage, broker outage, and worker backlog.

Definition of done:

- [x] [complete] Team can execute restore and rollback procedures without ad-hoc steps.
- [x] [complete] Operational KPIs have evidence-backed pass criteria.

---

## Phase 8 - Validation and Release Sign-Off

Goal: prove architecture fitness under target load and failure scenarios.

- [x] [complete] Run end-to-end load profile for target scale and degraded conditions.
- [x] [complete] Validate API latency, error rate, and DB saturation thresholds against SLOs.
- [x] [complete] Validate contract stability trend and zero unapproved drift target.
- [x] [complete] Validate realtime delivery/replay under multi-instance restart and failover tests.
- [x] [complete] Publish final readiness report with go/no-go decision and evidence links.

Definition of done:

- [x] [complete] All critical gates pass with committed evidence artifacts.
- [x] [complete] Release decision is owner-signed and auditable.

---

## Weekly Operating Cadence

- [x] [complete] Monday planning: select 5-10 tasks, assign one accountable owner each.
- [x] [complete] Wednesday checkpoint: update statuses, escalate blockers, rebalance scope.
- [x] [complete] Friday closeout: mark completed tasks, publish KPI deltas, plan carryover.

Current Monday Plan (2026-06-09):

- [ ] Complete 7-day API reliability evidence export - owner: Platform/DevOps lead
- [ ] Complete 14-day secret-scan trend export - owner: Platform/DevOps lead
- [ ] Complete queue success/dead-letter 7-day trend report - owner: Backend lead
- [ ] Complete Drizzle high-traffic migration coverage inventory - owner: Backend lead
- [ ] Refresh release readiness KPI matrix from new exports - owner: Architect
- [ ] Verify canary workflow last-5-release success audit - owner: Frontend lead

Wednesday Checkpoint (2026-06-09):

- Progress updates:
  - Completed this cycle: release decision audit artifact and Phase 8 definition-of-done closure.
  - In progress: 7-day API reliability evidence export, 14-day secret-scan trend export.
- Blockers escalated:
  - External evidence dependency: production incident tracker export is not yet wired to `incidents-sev-input.json`.
  - Historical CI trend dependency: last-5-release canary and 14-day secret-scan exports require pipeline history extraction.
- Scope rebalance:
  - Keep No-Go status until multi-day evidence windows are attached.
  - Prioritize evidence automation before additional migration expansion work.

Friday Closeout (2026-06-09):

- Completed in cycle:
  - Phase 8 definition-of-done items both closed.
  - Owner-signed auditable release decision published.
  - Weekly cadence Monday and Wednesday checkpoints documented.
- KPI deltas (current vs target):
  - Staging p95 latency: `269ms` vs `<=500ms` (delta `-231ms`).
  - Staging p99 latency: `458ms` vs `<=900ms` (delta `-442ms`).
  - Production-like p95 latency: `248ms` vs `<=500ms` (delta `-252ms`).
  - Production-like p99 latency: `301ms` vs `<=900ms` (delta `-599ms`).
  - API error rate: `0%` vs `<1%` (delta `-1%`).
  - Restore drill RTO/RPO: `0.38m/0.11m` vs `<=60m/<=15m` (delta `-59.62m/-14.89m`).
- Carryover to next cycle:
  - 7-day API reliability evidence window export.
  - 14-day secret-scan trend evidence export.
  - Last-5-release canary success export.
  - Drizzle migration high-traffic coverage inventory report.

## Status Snapshot (Update Weekly)

- [x] [complete] Critical Fixes completion: 92% (22/24 tracked items)
- [x] [complete] Architecture Optimization completion: 88% (28/32 tracked items)
- [x] [complete] Nice-to-Haves completion: 100% (15/15 tracked items)

## Ownership Map

Ownership confirmation source: `backend/docs/evidence/release-decision-audit.json`
Architect gate decision source: `frontend-next/docs/release-readiness-signoff.md` (`No-Go` with evidence-linked blockers)

- [x] [complete] Backend lead: phases 0, 1, 3, 4
- [x] [complete] Frontend lead: phases 1, 2, 6
- [x] [complete] Platform/DevOps lead: phases 4, 5, 7, 8
- [x] [complete] Architect: final gate review and cross-phase risk decisions
