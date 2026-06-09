# Production SLO Policy

## Scope

This policy defines production SLO targets and alert thresholds for GCM v2 backend-heavy operations.

## Service Level Objectives

### 1) API Latency SLO

- Objective:
  - p95 latency <= 500 ms for core authenticated API routes.
  - p99 latency <= 900 ms for core authenticated API routes.
- Measurement window: rolling 15 minutes and 24-hour summary.
- Exclusions: planned maintenance windows and known upstream outages.

### 2) API Reliability SLO

- Objective:
  - 5xx error rate < 1.0% over a rolling 15-minute window.
  - 5xx error rate < 0.5% daily aggregate.
- Measurement window: rolling 15 minutes and 24-hour summary.
- Error budget policy:
  - Warning at 50% budget burn.
  - Incident escalation at 100% budget burn.

### 3) Database Saturation SLO

- Objective:
  - DB CPU average < 70% during peak traffic windows.
  - Connection wait events near zero (no sustained queueing beyond 1 minute).
  - Slow query share (>= 200 ms) < 5% of total queries.
- Measurement window: rolling 15 minutes and 24-hour summary.

### 4) Worker Queue Lag SLO

- Objective:
  - p95 queue lag <= 30 seconds for normal jobs.
  - p99 queue lag <= 120 seconds.
  - Dead-letter rate < 0.5% per day.
- Measurement window: rolling 15 minutes and 24-hour summary.

## Alerting Thresholds

- API latency alert:
  - warning when p95 > 500 ms for 15 minutes.
  - critical when p95 > 700 ms for 15 minutes.
- API error-rate alert:
  - warning when 5xx >= 1.0% for 10 minutes.
  - critical when 5xx >= 2.0% for 5 minutes.
- DB saturation alert:
  - warning when DB CPU >= 70% for 15 minutes.
  - critical when DB CPU >= 85% for 10 minutes.
- Queue lag alert:
  - warning when p95 lag > 30 seconds for 15 minutes.
  - critical when p95 lag > 90 seconds for 10 minutes.

## Burn-Rate Alerts Mapped to Rollback Criteria

- Error budget baseline: availability SLO `99.5%` (`0.5%` error budget).
- Burn-rate evidence command: run `backend` -> `npm run evidence:slo-burn`.
- Evidence artifact: `../backend/docs/evidence/slo-burn-rate-latest.json`.
- Rollback mapping:
  - immediate rollback required when `burnRate(last5m) >= 14.4` and `burnRate(last1h) >= 6`.
  - urgent rollback required when `burnRate(last30m) >= 6` and `burnRate(last6h) >= 3`.
  - warning only when `burnRate(last30m) >= 3` without urgent/immediate trigger.
- Release gate: if evidence says `decision.rollbackRequired=true`, canary promotion must stop and rollback workflow must execute.

## Validation and Reporting

- Weekly:
  - Publish SLO compliance summary in release readiness notes.
- Per release:
  - Attach SLO trend snapshots to release sign-off.
- Incident follow-up:
  - Any SLO breach requires root-cause analysis and remediation actions.

## Ownership

- Primary owner: backend lead.
- Secondary owners: DevOps and QA/performance.

## Data Sources

- API and middleware metrics from backend metrics service.
- Database telemetry from managed database monitoring.
- Queue telemetry from worker/queue platform metrics.
