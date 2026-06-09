# Redis Foundation

## Purpose

Provide shared Redis capabilities for:

- Distributed rate-limit counters
- Idempotency key fast-path caching
- Short-lived token state storage

## Toggles

- REDIS_ENABLED=true enables Redis state services.
- REDIS_URL must be set when REDIS_ENABLED=true.
- RL_USE_REDIS_STORE=true enables Redis store for rate-limit policies.

## Current Integration

- Rate limiting can use Redis-backed counters through middleware store.
- Backup trigger idempotency replays can return from Redis cache before DB query.
- Shared helpers are available for short-lived token state.

## Notes

- Services degrade gracefully to existing behavior when Redis is disabled.
- Keep Redis TTLs conservative and scoped per use case.
