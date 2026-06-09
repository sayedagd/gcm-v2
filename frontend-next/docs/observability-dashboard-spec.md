# Observability Dashboard Spec (Grafana or Datadog)

## Purpose

Define the first production dashboard for API, database, and platform health using the backend metrics endpoint and infrastructure telemetry.

## Data Sources

- App metrics endpoint:
  - GET /api/v1/system/metrics
- Database monitoring:
  - CPU
  - active connections
  - wait events
- Host/runtime monitoring:
  - memory
  - CPU
  - network

## Dashboard Layout

### Row 1: API Golden Signals

- Panel: Request volume (15m)
  - Metric: metrics.requestCount15m
- Panel: Error rate (15m)
  - Metric: metrics.errorRatePercent15m
- Panel: Latency p50/p95/p99 (15m)
  - Metrics:
    - metrics.latencyP50Ms15m
    - metrics.latencyP95Ms15m
    - metrics.latencyP99Ms15m
- Panel: 5xx count (15m)
  - Metric: metrics.requestErrors15m

### Row 2: Database Health

- Panel: DB query volume and average latency
  - Metrics:
    - metrics.dbQueryCount15m
    - metrics.dbAvgLatencyMs15m
- Panel: DB latency p50/p95/p99
  - Metrics:
    - metrics.dbLatencyP50Ms15m
    - metrics.dbLatencyP95Ms15m
    - metrics.dbLatencyP99Ms15m
- Panel: Slow query count (15m)
  - Metric: metrics.dbSlowQueryCount15m
- Panel: Top slow query fingerprints
  - Metric: metrics.dbTopSlowFingerprints15m

### Row 3: Realtime and Security

- Panel: SSE connected clients
  - Metric: metrics.sseConnectedCurrent
- Panel: SSE disconnects (15m)
  - Metric: metrics.sseDisconnects15m
- Panel: Auth failures (15m)
  - Metric: metrics.authFailures15m

### Row 4: Jobs and Platform Placeholders

- Panel: Queue depth placeholders
  - Metrics:
    - metrics.queueDepths.ocr
    - metrics.queueDepths.backups
    - metrics.queueDepths.whatsapp
- Panel: Backup failures (24h)
  - Metric: metrics.backupFailures24h
- Panel: API process uptime
  - Metric: uptimeSeconds

## Alert Rules

- API error rate critical:
  - Trigger when metrics.errorRatePercent15m >= 2.0 for 5m.
- API latency warning:
  - Trigger when metrics.latencyP95Ms15m > 500 for 15m.
- DB saturation warning:
  - Trigger when DB CPU >= 70% for 15m.
- DB slow query warning:
  - Trigger when metrics.dbSlowQueryCount15m > 20 for 15m.
- SSE stability warning:
  - Trigger when metrics.sseDisconnects15m > threshold for 15m.

## Dashboard Variables

- environment: production, staging
- service: backend-api, worker
- route_group: auth, operations, reporting, ai

## Implementation Notes

- Keep panel names identical across Grafana and Datadog to simplify runbooks.
- Use 15-minute and 24-hour presets for operational and trend views.
- Never include raw SQL text in dashboard logs; use fingerprints only.
