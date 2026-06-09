# Incident Playbooks

## Ownership

- Primary owner: Platform/DevOps lead
- Secondary owner: Backend lead
- Last reviewed: 2026-06-09

## Scope

Operational playbooks for the highest-risk failure modes:

- Database outage
- Realtime broker outage
- Authentication outage
- Worker backlog growth

## Severity Levels

- Sev-1: customer-facing outage or data-loss risk
- Sev-2: major degradation with partial service

## Playbook: Database Outage

### DB Outage Detection Signals

- API 5xx rate spike on read/write endpoints
- DB dependency health failing in readiness endpoint
- Connection timeout or pool exhaustion errors

### DB Outage Immediate Actions

1. Declare incident and set Sev level.
2. Freeze schema-changing deploys.
3. Route traffic to degraded mode for non-critical endpoints.
4. Confirm DB provider status and failover state.
5. Restart API workers only after DB recoverability is confirmed.

### DB Outage Recovery Validation

- `/api/v1/ping` and `/api/v1/system/health/*` return healthy.
- CRUD flows for users/projects/trips recover to baseline error rates.

## Playbook: Broker Outage

### Broker Outage Detection Signals

- SSE reconnect spikes and event delivery lag
- Broker connection errors in event bus logs
- Growing replay backlog or missed event alarms

### Broker Outage Immediate Actions

1. Keep API online with local fallback fanout if configured.
2. Reduce non-critical publish volume.
3. Restart broker connection clients and verify channel subscription.
4. If multi-instance consistency is at risk, limit traffic to single serving instance temporarily.

### Broker Outage Recovery Validation

- Cross-instance event fanout resumes.
- Last-Event-ID replay catches up without event loss.

## Playbook: Auth Outage

### Auth Outage Detection Signals

- Sudden 401/403 spike for valid sessions
- Login endpoint failures above threshold
- JWT/cookie validation errors clustered by release

### Auth Outage Immediate Actions

1. Validate auth secret and cookie config integrity.
2. Roll back latest auth-related deployment if correlated.
3. Re-enable stable login path and clear broken session cookies.
4. Pause risky write operations until auth is stable.

### Auth Outage Recovery Validation

- Login and logout success rates return to baseline.
- Protected endpoint access for valid users is restored.

## Playbook: Worker Backlog

### Worker Backlog Detection Signals

- Queue depth sustained above SLO threshold
- OCR/WhatsApp/backup job latency increasing
- Dead-letter ratio increasing

### Worker Backlog Immediate Actions

1. Scale worker replicas and verify consumer health.
2. Prioritize critical job types and throttle non-critical producers.
3. Inspect failed jobs by error class and apply targeted retries.
4. If needed, pause optional job ingestion until backlog normalizes.

### Worker Backlog Recovery Validation

- Queue depth and job age trend downward.
- Success rate and dead-letter ratio return inside KPI targets.

## Post-Incident Requirements

- Publish timeline, root cause, and remediation actions.
- Link evidence in release readiness sign-off.
- Create preventive tasks with owners and due dates.
