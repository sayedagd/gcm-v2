# Managed Services Matrix

## Goal

Define the target managed service footprint for production and non-production environments so infrastructure choices are explicit, reviewable, and repeatable.

## Service Matrix

| Domain | Preferred Managed Service | Fallback/Alternative | Minimum Capability Requirements | Ownership |
| --- | --- | --- | --- | --- |
| Compute | Managed container or server runtime for API and workers | Managed VM runtime with process supervisor | Separate API and worker runtimes, health checks, rolling deploy support, autoscaling hooks | Platform/DevOps |
| Database | Managed PostgreSQL with HA and PITR | Self-managed PostgreSQL with managed backups | Point-in-time recovery, connection pooling support, read replica option, automated backups | Platform/DevOps + Backend |
| Redis | Managed Redis (single primary + replica) | Self-managed Redis with persistence | TLS in transit, auth enabled, eviction policy control, failover support | Platform/DevOps |
| Object Storage | Managed object storage bucket for backup artifacts | Provider-compatible S3 API storage | Versioning, lifecycle rules, encryption at rest, signed URL support | Platform/DevOps + Backend |
| Observability | Managed logs + metrics + tracing stack | Split vendors for logs/metrics/traces | Retention controls, alert routing, dashboard sharing, API access for automation | Platform/DevOps |

## Environment Targets

| Environment | Compute | Database | Redis | Object Storage | Observability |
| --- | --- | --- | --- | --- | --- |
| Local Dev | Local processes/containers | Local PostgreSQL container | Local Redis container | Local S3-compatible store | Console logs + local metrics |
| CI | Ephemeral job runtime | Ephemeral PostgreSQL service | Ephemeral Redis service | Mocked or ephemeral object store | CI artifacts + test telemetry |
| Staging | Managed runtime (single region) | Managed PostgreSQL (staging tier) | Managed Redis (staging tier) | Managed bucket (staging namespace) | Shared staging dashboards + alerts |
| Production | Managed runtime (multi-instance) | Managed PostgreSQL (HA + PITR) | Managed Redis (HA) | Managed bucket with retention lifecycle | Production-grade SLO dashboards + paging |

## Selection Rules

- Keep API runtime stateless; all durable state must live in database, Redis, or object storage.
- Keep worker runtime independently scalable from API runtime.
- Use managed offerings in production unless an explicit exception is approved in architecture review.
- Enforce TLS and IAM-scoped credentials for every managed service integration.

## Change Control

- Any managed service provider or tier change must update this matrix and the release checklist in the same pull request.
- Any change affecting database or object storage must include backup/restore impact notes.
- Any change affecting Redis must include realtime broker and rate-limit impact notes.

## Verification Checklist

- Production environment variables map cleanly to compute, database, Redis, object storage, and observability services.
- API and worker deployments are separated and can be rolled independently.
- Backup artifacts are written to object storage and can be restored through the documented runbook.
- Observability dashboards and alerts cover API latency, worker backlog, broker health, and database saturation.
