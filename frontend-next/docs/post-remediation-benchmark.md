# Post-Remediation Benchmark Report

## Scope

This report validates SLO compliance under two runtime modes:

- Peak mode: expected 10x profile concurrency.
- Degraded mode: elevated concurrency and tighter timeout constraints.

Evidence sources:

- `docs/baseline-metrics.json` (peak mode)
- `docs/baseline-metrics.degraded.json` (degraded mode)

## SLO Targets

- Success rate: `>= 99%`
- API latency p95: `<= 500ms`
- API latency p99: `<= 900ms`

## Validation Results

### Peak Mode

- Endpoint: `https://gcm-back.twision.agency/api/v1/ping`
- Concurrency: `20`
- Requests: `703`
- Success rate: `100%` -> PASS
- p95 latency: `263ms` -> PASS
- p99 latency: `432ms` -> PASS

### Degraded Mode

- Endpoint: `https://gcm-back.twision.agency/api/v1/ping`
- Concurrency: `80`
- Timeout: `3000ms`
- Requests: `2811`
- Success rate: `100%` -> PASS
- p95 latency: `263ms` -> PASS
- p99 latency: `407ms` -> PASS

## Remediation List

1. Add automated scheduled execution for `perf:10x` and persist trend history per release.
2. Add route-level 10x profiles for authenticated high-traffic endpoints (auth/trips/dashboard) instead of ping-only synthetic path.
3. Add explicit degraded-network profile (latency/jitter injection) in CI perf environment.

## Decision

- Overall SLO validation status: `PASS`

## KPI Assessment - API Latency (Critical)

Target:

- p95 less than or equal to `500ms`
- p99 less than or equal to `900ms`
- Scope: core authenticated routes under peak-hour profile

Evidence available:

- Peak synthetic probe (`/api/v1/ping`): p95 `263ms`, p99 `432ms`
- Degraded synthetic probe (`/api/v1/ping`): p95 `263ms`, p99 `407ms`
- KPI suite staging probe (`/api/v1/ping`): p95 `257ms`, p99 `434ms`
- KPI suite production-like probe (`/api/v1/ping`): p95 `246ms`, p99 `281ms`

Result:

- FAIL for KPI acceptance criteria (route-scope mismatch; no committed route-level histogram evidence for core authenticated routes yet).

## KPI Assessment - Database Saturation (Critical)

Target:

- Average DB CPU below `70%`
- Connection wait events near zero
- Scope: controlled `5x` load run

Evidence available:

- Current benchmark artifacts in this report and `docs/baseline-metrics.json` are API probe snapshots only.
- No committed DB CPU trend export or connection wait-event capture is attached for the required 5x load window.

Result:

- FAIL for KPI acceptance criteria (required DB saturation telemetry evidence not yet committed).

## Reproduction

Run from `backend`:

```bash
npm run perf:10x
```

Degraded mode example:

```bash
PERF_10X_BACKEND_URL=https://gcm-back.twision.agency \
PERF_10X_DURATION_SECONDS=10 \
PERF_10X_CONCURRENCY=80 \
PERF_10X_TIMEOUT_MS=3000 \
PERF_10X_OUTPUT_PATH=../frontend-next/docs/baseline-metrics.degraded.json \
npm run perf:10x
```
