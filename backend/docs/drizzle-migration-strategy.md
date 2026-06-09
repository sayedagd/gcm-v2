# Drizzle Migration Strategy Decision

## Decision

Use vertical-slice migration by module, not big-bang.

## Why This Decision

- Reduces blast radius for regressions.
- Preserves delivery velocity while modernizing data access.
- Supports parity testing per module before expansion.
- Keeps critical raw SQL paths stable until Drizzle equivalents are proven.

## Execution Order

1. Auth slice:
   - login
   - users
2. Core slice:
   - companies
   - projects
   - services
3. Operations slice:
   - trips
   - requests
   - notifications
4. Reporting slice:
   - dashboard and export queries

## Guardrails

- Every slice must include parity tests against current behavior.
- Migrations and schema changes are required to stay in sync with SQL source of truth.
- No module moves to complete without validation gates passing.

## Completion Criteria

- Slice marked complete only after:
  - tests pass
  - OpenAPI behavior unchanged or intentionally versioned
  - performance is neutral or improved for target endpoints
