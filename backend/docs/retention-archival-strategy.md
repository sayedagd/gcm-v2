# Retention and Archival Strategy

## Objective

Define retention windows and archival flow for operational logs, realtime replay events, and backup metadata tables without impacting request-path latency.

## Table Scope

- `event_bus_replay`: transient replay stream for Last-Event-ID recovery.
- `backup_job_runs`: operational history for backup execution lifecycle.
- `backup_artifacts`: metadata index for created backup files.

## Retention Windows

| Table | Hot retention | Archive retention | Purge policy |
| --- | --- | --- | --- |
| `event_bus_replay` | 7 days | none | Hard delete records older than replay window. |
| `backup_job_runs` | 90 days | 365 days | Move old rows to archive table, then purge from hot table. |
| `backup_artifacts` | 180 days metadata in hot table | 730 days metadata in archive table | Archive metadata rows not referenced by active runs, then purge hot table rows. |

## Archival Rules

1. Run archival in worker/scheduler context only, never in request path.
2. Archive first, then delete from hot tables in the same transaction where possible.
3. Keep archive tables append-only with `archived_at` timestamp.
4. Preserve joinability between `backup_job_runs` and `backup_artifacts` by storing original IDs.
5. Emit structured logs and metrics for archived row counts and purge failures.

## Runtime Controls

Use environment variables to tune retention without code edits:

- `EVENT_BUS_REPLAY_RETENTION_DAYS` default `7`
- `BACKUP_JOB_RUNS_RETENTION_DAYS` default `90`
- `BACKUP_JOB_RUNS_ARCHIVE_DAYS` default `365`
- `BACKUP_ARTIFACTS_RETENTION_DAYS` default `180`
- `BACKUP_ARTIFACTS_ARCHIVE_DAYS` default `730`

## Operational Cadence

- Daily: purge `event_bus_replay` older than configured replay retention.
- Weekly: archive and purge old `backup_job_runs` and `backup_artifacts` metadata.
- Monthly: verify archive table growth and storage cost against forecast.

## Verification Checklist

- Retention job logs archived and purged row counts per table.
- No orphaned `backup_job_runs.artifact_id` references after archival cycle.
- Restore drills can access required backup metadata from archive tables.
- No retention execution occurs in API request handlers.
