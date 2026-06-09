# Baseline Performance Metrics

This baseline is captured by `backend/scripts/perf/capture-baseline.mjs` and written to `frontend-next/docs/baseline-metrics.json`.

## Current Snapshot

- Captured at: `2026-06-09T08:08:15.234Z`
- Frontend base: `https://gcm.twision.agency`
- Backend base: `https://gcm.twision.agency`
- API latency URL: `https://gcm.twision.agency/api/v1/ping`

## Baseline Values

- TTFB: `570ms`
- Hydration proxy: `1ms`
- Route transition: `1887ms`
- API latency: `375ms` (status `404`)

## Metric Definitions

- TTFB: Navigation `responseStart` on `/landing`.
- Hydration proxy: `loadEventEnd - domContentLoadedEventEnd` on `/landing`.
- Route transition: time from `/landing` to `/store` navigation completion.
- API latency: request duration for `PERF_API_LATENCY_URL` (default `${PERF_BACKEND_URL}/api/v1/ping`).

## Notes

- The API latency probe endpoint currently returns non-2xx in this environment.
- For production baselines, set `PERF_BACKEND_URL` and/or `PERF_API_LATENCY_URL` to a guaranteed live API endpoint before capture.
- Supporting timing snapshot:
  - DOMContentLoaded: `1279ms`
  - Interactive: `1278ms`
  - Total load: `1280ms`
