# Environment Inventory

## Goal

Maintain a single auditable inventory of runtime environment variables, owning team, secret source, and rotation cadence.

## Secret Source Definitions

- gitignored local env file: local development only.
- managed secrets manager: production-grade secret store (cloud secret manager or equivalent).
- platform env var: managed deployment environment variable store.

## Inventory

| Variable | Scope | Owner | Secret Source | Rotation Cadence | Notes |
| --- | --- | --- | --- | --- | --- |
| JWT_SECRET | api, worker | Backend | managed secrets manager | 90 days | Required for auth token signing. |
| DATABASE_URL | api, worker | Platform/DevOps | managed secrets manager | 180 days | Direct DB endpoint fallback. |
| DATABASE_POOL_URL | api, worker | Platform/DevOps | managed secrets manager | 180 days | Managed DB pool endpoint for production/staging. |
| DB_POOL_MODE | api, worker | Platform/DevOps | platform env var | On change | Allowed values: auto, pgbouncer, direct. |
| REDIS_URL | api, worker | Platform/DevOps | managed secrets manager | 180 days | Required in production. |
| REDIS_ENABLED | api, worker | Platform/DevOps | platform env var | On change | Must be true in production. |
| EVENT_BUS_BROKER | api, worker | Backend | platform env var | On change | Must be redis in production. |
| BACKUP_STORAGE_PROVIDER | worker | Backend + Platform/DevOps | platform env var | On change | Must be s3 in production. |
| S3_BACKUP_BUCKET | worker | Platform/DevOps | platform env var | On change | Backup artifact destination bucket. |
| S3_BACKUP_REGION | worker | Platform/DevOps | platform env var | On change | Region for backup bucket. |
| S3_BACKUP_ACCESS_KEY_ID | worker | Platform/DevOps | managed secrets manager | 90 days | Backup object storage credential id. |
| S3_BACKUP_SECRET_ACCESS_KEY | worker | Platform/DevOps | managed secrets manager | 90 days | Backup object storage credential secret. |
| GEMINI_API_KEY | api, worker | Backend | managed secrets manager | 90 days | Required for OCR integration. |
| GROQ_API_KEY | api | Backend | managed secrets manager | 90 days | Optional assistant integration key. |
| CLIMATIQ_API_KEY | api | Backend | managed secrets manager | 90 days | Optional carbon estimation integration key. |
| AUTH_COOKIE_SECURE | api | Backend | platform env var | On change | Must be true in production. |
| CORS_ALLOWED_ORIGINS | api | Backend | platform env var | On change | Deployment-bound frontend origins. |
| PROCESS_ROLE | api, worker | Platform/DevOps | platform env var | On change | api or worker role assignment. |

## Rotation Procedure

1. Rotate credentials in the managed secrets manager first.
2. Update runtime environment references in staging.
3. Validate staging health checks and backup trigger flow.
4. Promote secrets to production during scheduled release window.
5. Record rotation date and approver in release evidence log.

## Audit Checklist

- Inventory matches current .env.example and production deployment settings.
- Every secret has a named owner and defined rotation cadence.
- Production-only requirements are enforced by runtime validation checks.
- Any new environment variable is added to this inventory in the same pull request.
