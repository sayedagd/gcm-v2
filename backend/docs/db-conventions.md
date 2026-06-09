# Database Conventions and Migration Standards

## Naming Conventions

- Tables:
  - Use snake_case plural names (example: users, project_services).
- Columns:
  - Use snake_case.
  - Primary identifiers use explicit names (example: user_id, project_id) when domain-specific.
- Foreign keys:
  - Follow parent key name exactly (example: projects.company_id -> companies.company_id).

## Nullability Rules

- Use NOT NULL for required domain fields and auth-critical fields.
- Nullable fields are allowed only for optional business metadata.
- Avoid nullable booleans; prefer NOT NULL with explicit defaults.

## Default Value Rules

- Timestamps:
  - Use DB-side defaults for created_at where practical.
- Status fields:
  - Define explicit defaults (example: ACTIVE, PENDING).
- Numeric counters:
  - Default to 0 where semantically valid.

## Migration Rules

- Migration style:
  - Vertical-slice by module.
- Migration source of truth:
  - Drizzle schema and generated SQL migrations.
- Every migration must be:
  - Forward-only.
  - Reviewed for rollback strategy in deployment notes.
  - Tested on staging before production.
- Never edit an already applied migration file.
  - Add a new migration for corrections.

## Transactional Boundaries

- Multi-table writes must run inside a transaction.
- Controllers should not manage transaction internals directly.
  - Use service/repository boundary to start and complete transactions.
- Partial write operations are forbidden for business-critical flows.

## Query and Performance Rules

- Tag expensive/critical queries using queryTag in DB call options.
- Use slow-query fingerprint telemetry for triage.
- Add indexes only with evidence from query plans and metrics.

## API and Schema Alignment

- Schema changes affecting API contracts must update:
  - OpenAPI contract.
  - affected tests.
  - migration notes.
- No merge without passing CI checks and parity tests for touched slices.

## Review Checklist

- Does this change keep naming conventions consistent?
- Are nullability/default choices explicit and justified?
- Are migrations forward-only and tested?
- Are transactions correctly applied for multi-write workflows?
- Are API contract and tests updated for schema-impacting changes?
