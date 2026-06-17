-- Restore compatibility patch for legacy backup replay.
-- Safe/idempotent: additive nullable columns only.

ALTER TABLE public.trips
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS archived_by TEXT,
    ADD COLUMN IF NOT EXISTS client_ref TEXT,
    ADD COLUMN IF NOT EXISTS source TEXT,
    ADD COLUMN IF NOT EXISTS client_signature TEXT,
    ADD COLUMN IF NOT EXISTS client_stamp TEXT,
    ADD COLUMN IF NOT EXISTS gcm_signature TEXT,
    ADD COLUMN IF NOT EXISTS gcm_stamp TEXT;

ALTER TABLE public.tanks
    ADD COLUMN IF NOT EXISTS gps_location TEXT,
    ADD COLUMN IF NOT EXISTS supplier_name TEXT;

ALTER TABLE public.contact_submissions
    ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMPTZ;

ALTER TABLE public.containers
    ADD COLUMN IF NOT EXISTS gps_location TEXT,
    ADD COLUMN IF NOT EXISTS supplier_name TEXT;

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS active_session_id TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS signature TEXT,
    ADD COLUMN IF NOT EXISTS stamp TEXT;

ALTER TABLE public.suppliers
    ADD COLUMN IF NOT EXISTS contact_person TEXT;