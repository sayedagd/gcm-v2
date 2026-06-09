# Managed Database Pooling

## Goal

Support managed pool endpoints (for example PgBouncer/provider poolers) without code changes between environments.

## Configuration

- DB_POOL_MODE=auto|pgbouncer|direct
- DATABASE_POOL_URL=pooled-endpoint-url
- DATABASE_URL=direct-endpoint-url
- DB_POOL_MAX=50
- DB_POOL_IDLE_MS=30000
- DB_POOL_CONN_TIMEOUT_MS=10000
- DB_MAX_CONNECTIONS=200
- DB_RESERVED_CONNECTIONS=20
- API_INSTANCE_COUNT=2
- WORKER_INSTANCE_COUNT=2

## Mode Behavior

- auto: use DATABASE_POOL_URL when present, otherwise DATABASE_URL.
- pgbouncer: force DATABASE_POOL_URL.
- direct: force DATABASE_URL.

## Operational Notes

- Keep API pool max conservative when using pooled endpoints.
- Tune DB_POOL_MAX per instance based on real concurrency and DB limits.
- Monitor connection wait, timeout, and saturation metrics after rollout.
- Run `npm run perf:recommend-db-pool` to generate a baseline per-instance pool recommendation.

## Standard Environment Profile

| Environment | API DB_POOL_MAX | Worker DB_POOL_MAX | DB_POOL_IDLE_MS | DB_POOL_CONN_TIMEOUT_MS | DB_POOL_MODE |
| --- | --- | --- | --- | --- | --- |
| development | 50 | 30 | 30000 | 10000 | auto |
| test | 50 | 30 | 30000 | 10000 | auto |
| staging | 30 | 18 | 25000 | 9000 | auto |
| production | 35 | 20 | 20000 | 8000 | auto or pgbouncer |

### Production Guardrails

- DATABASE_POOL_URL is required in production.
- DB_POOL_MODE=direct is not allowed in production.
- DB_POOL_MODE=pgbouncer requires DATABASE_POOL_URL.
- DB_POOL_MAX, DB_POOL_IDLE_MS, and DB_POOL_CONN_TIMEOUT_MS must be positive integers when set.
