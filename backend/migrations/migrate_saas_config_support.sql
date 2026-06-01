-- ============================================================
-- Migration: Add support_phone & support_whatsapp to saas_config
-- Run this ONCE on the production database via cPanel phpPgAdmin
-- ============================================================

-- Step 1: Add columns if they don't exist
ALTER TABLE saas_config ADD COLUMN IF NOT EXISTS support_phone VARCHAR(50);
ALTER TABLE saas_config ADD COLUMN IF NOT EXISTS support_whatsapp VARCHAR(50);

-- Step 2: Ensure the SINGLETON row exists (in case it was never created)
INSERT INTO saas_config (id)
VALUES ('SINGLETON')
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify
SELECT id, support_phone, support_whatsapp FROM saas_config WHERE id = 'SINGLETON';
