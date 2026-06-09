# Query Plan Review Process

## Goal

Run repeatable index and query-plan checks for the top 20 expensive SQL statements.

## Command

From backend workspace:

```bash
npm run perf:query-plans
```

## Inputs

- `DATABASE_URL`: PostgreSQL connection string.
- `PERF_TOP_QUERY_COUNT` (optional): defaults to `20`.
- `PERF_QUERY_PLAN_OUTPUT` (optional): defaults to `backend/docs/query-plan-top20.md`.
- `PERF_REQUIRE_PG_STAT_STATEMENTS` (optional): defaults to `true`.

## What It Checks

1. Reads top expensive statements from `pg_stat_statements` sorted by total execution time.
2. Captures calls, mean latency, total latency, and rows.
3. Attempts `EXPLAIN` for safe non-parameterized `SELECT` statements.
4. Produces a deterministic markdown report for review and index decisions.

## Follow-up Rules

- Add or adjust indexes only when the report confirms high cost and planner mismatch.
- Validate index impact by re-running the report after migration.
- Avoid broad indexes without workload evidence.
