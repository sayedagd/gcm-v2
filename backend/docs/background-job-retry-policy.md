# Background Job Retry and Dead-Letter Policy

## Ownership

- Primary owner: Platform/DevOps lead
- Secondary owner: Backend lead
- Last reviewed: 2026-06-09

## Scope

This policy applies to asynchronous OCR and WhatsApp jobs executed by dedicated workers.

## Lifecycle States

- PENDING: job created and ready to be claimed.
- PROCESSING: worker claimed the job and is executing it.
- RETRY: execution failed and job is scheduled for a later attempt.
- COMPLETED: execution succeeded.
- DEAD_LETTER: execution failed permanently after max attempts.

## Retry Rules

- Attempts are incremented when a worker claims a job.
- Maximum attempts are configurable per job type.
- Backoff uses exponential delay:
  - delaySeconds = BASE_SECONDS * 2^(attempts - 1)
- Retry delay and max attempts are configurable via environment variables.

## Dead-Letter Rules

- When attempts reaches max attempts, job transitions to DEAD_LETTER.
- DEAD_LETTER jobs are excluded from normal worker claim queries.
- DEAD_LETTER timestamp and last error are persisted for triage.

## Config Variables

- OCR_WORKER_POLL_MS
- OCR_JOB_MAX_ATTEMPTS
- OCR_JOB_BACKOFF_BASE_SECONDS
- WHATSAPP_WORKER_POLL_MS
- WHATSAPP_JOB_MAX_ATTEMPTS
- WHATSAPP_JOB_BACKOFF_BASE_SECONDS

## Operational Guidance

- Monitor RETRY and DEAD_LETTER counts per worker.
- Alert when DEAD_LETTER growth exceeds expected baseline.
- Create periodic triage for DEAD_LETTER records and root-cause analysis.
