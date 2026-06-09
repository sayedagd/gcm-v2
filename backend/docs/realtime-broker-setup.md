# Realtime Broker Setup

## Ownership

- Primary owner: Platform/DevOps lead
- Secondary owner: Backend lead
- Last reviewed: 2026-06-09

## Goal

Enable cross-instance SSE fanout using Redis pub/sub.

## Config

- EVENT_BUS_BROKER=redis
- REDIS_URL=redis-connection-string
- EVENT_BUS_REDIS_CHANNEL=gcm:event-bus
- EVENT_BUS_REPLAY_LIMIT=200
- EVENT_BUS_REPLAY_RETENTION_DAYS=7

## Behavior

- When broker is enabled and healthy, backend publishes events to Redis channel.
- Each API instance subscribes to the same channel and delivers events to its local SSE clients.
- If Redis is unavailable or not configured, service falls back to local in-process fanout.
- Reconnect clients can provide Last-Event-ID to replay missed events from persistent store.

## Rollout Notes

1. Deploy Redis first.
2. Set EVENT_BUS_BROKER=redis and REDIS_URL on all API instances.
3. Verify event delivery across at least two instances.
4. Monitor Redis connection errors and SSE delivery rate.
