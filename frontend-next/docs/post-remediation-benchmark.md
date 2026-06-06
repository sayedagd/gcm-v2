# Post-Remediation Benchmark Report

## Scope

This report evaluates post-remediation performance against explicit acceptance thresholds for:

- TTFB
- Hydration proxy
- Route transition
- API latency

Source snapshot: `docs/baseline-metrics.json`.

## Acceptance Thresholds

- TTFB: `<= 800ms`
- Hydration proxy: `<= 200ms`
- Route transition (`/landing` -> `/store`): `<= 2500ms`
- API latency: `<= 500ms` with expected production API status (`2xx/4xx auth-gated`) from a valid endpoint

## Benchmark Results

- TTFB: `469ms` -> PASS
- Hydration proxy: `91ms` -> PASS
- Route transition: `1663ms` -> PASS
- API latency: `336ms` with status `404` -> CONDITIONAL (latency budget passed, endpoint mapping needs environment override)

## Decision

- Overall status: `CONDITIONAL PASS`
- Required follow-up before release sign-off: set `PERF_API_LATENCY_URL` to a known live API endpoint in target environment and recapture to confirm status contract.

## Reproduction

Run from `backend`:

```bash
npm run perf:baseline
```

Optional environment overrides:

```bash
PERF_FRONTEND_URL=https://your-frontend-host \
PERF_BACKEND_URL=https://your-backend-host \
PERF_API_LATENCY_URL=https://your-backend-host/api/v1/ping \
npm run perf:baseline
```
