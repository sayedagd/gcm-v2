# Next-Quarter Capacity Roadmap

## Inputs

- `docs/post-remediation-benchmark.md`
- `docs/baseline-metrics.json`
- `docs/baseline-metrics.degraded.json`

## Bottleneck Remediation Backlog

### Priority 1

- Expand load coverage from ping-only to authenticated high-traffic endpoints:
  - `/api/v1/auth/login`
  - `/api/v1/trips`
  - `/api/v1/system/metrics`
- Add queue/backlog SLO dashboards for OCR, WhatsApp, and backup workers.
- Enable scheduled 10x benchmark execution after each release train.

### Priority 2

- Add degraded-network test profile with latency/jitter injection.
- Add route-level cache effectiveness metrics for projects/trips/dashboard aggregate reads.
- Add DB query-plan regression checks to release checklist using top-20 report trend deltas.

### Priority 3

- Evaluate broker and redis memory growth against quarterly projection.
- Tune retention windows using measured archive growth and restore drill evidence.

## Quarterly Capacity Targets

- API p95 remains <= 500ms under quarterly peak profile.
- API p99 remains <= 900ms under quarterly peak profile.
- Queue success rate remains >= 99%.
- Dead-letter ratio remains < 0.5%.
- DB CPU remains < 70% during 5x sustained load test.

## Delivery Plan

### Month 1

- Implement authenticated endpoint load suite.
- Add automated benchmark publication in CI artifacts.
- Publish first monthly capacity review with cost guardrail status.

### Month 2

- Add degraded-network injection suite.
- Integrate queue backlog alerts and dead-letter trend monitoring.
- Complete first query-plan trend comparison cycle.

### Month 3

- Re-run full 10x validation using expanded endpoint suite.
- Recalibrate worker scaling thresholds and pool tuning settings.
- Produce quarter-end architecture readiness delta report.

## Ownership

- Backend lead: API, DB, and worker scaling actions.
- DevOps lead: CI perf automation, alerts, and rollout controls.
- Architect: quarterly readiness review and risk acceptance.
