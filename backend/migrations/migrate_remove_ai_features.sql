-- Remove legacy AI/OCR persistence objects.
-- Safe to run multiple times.

BEGIN;

DROP INDEX IF EXISTS idx_ocr_jobs_status_created_at;

DROP TABLE IF EXISTS ai_messages CASCADE;
DROP TABLE IF EXISTS ai_sessions CASCADE;
DROP TABLE IF EXISTS ocr_jobs CASCADE;

COMMIT;
