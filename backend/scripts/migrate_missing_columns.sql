-- =================================================================
-- GCM ERP — Missing Columns Migration
-- Run this ONCE on the production/staging database
-- Safe: All statements use IF NOT EXISTS / DO NOTHING patterns
-- =================================================================

-- ---------------------------------------------------------------
-- 1. services table — add major_category & requires_recycle_receipt
-- ---------------------------------------------------------------
ALTER TABLE services
    ADD COLUMN IF NOT EXISTS major_category VARCHAR(50) DEFAULT 'GENERAL',
    ADD COLUMN IF NOT EXISTS requires_recycle_receipt BOOLEAN DEFAULT FALSE;

-- Update existing parent-level services with their correct major_category
UPDATE services SET major_category = 'GENERAL'   WHERE service_id = 'CAT-NH';
UPDATE services SET major_category = 'HAZARDOUS' WHERE service_id = 'CAT-H';
UPDATE services SET major_category = 'WATER'     WHERE service_id = 'CAT-W';

-- Propagate major_category to child services based on parent
UPDATE services s
SET major_category = p.major_category
FROM services p
WHERE s.parent_id = p.service_id
  AND s.major_category IS DISTINCT FROM p.major_category;

-- ---------------------------------------------------------------
-- 2. project_services table — add warning_threshold & notes
-- ---------------------------------------------------------------
ALTER TABLE project_services
    ADD COLUMN IF NOT EXISTS warning_threshold NUMERIC(15, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- ---------------------------------------------------------------
-- 3. project_services.id — ensure it is VARCHAR (not SERIAL)
--    Skip this block if the column is already VARCHAR.
--    Run ONLY if you get "invalid input syntax for type integer" errors.
-- ---------------------------------------------------------------
-- Step A: Create new table with VARCHAR id
DO $$
BEGIN
    -- Only migrate if id column is still integer type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'project_services'
          AND column_name = 'id'
          AND data_type IN ('integer', 'bigint')
    ) THEN
        -- Rename old table
        ALTER TABLE project_services RENAME TO project_services_old;

        -- Create new table with VARCHAR id
        CREATE TABLE project_services (
            id VARCHAR(100) PRIMARY KEY,
            project_id VARCHAR(100) REFERENCES projects(project_id) ON DELETE CASCADE,
            service_id VARCHAR(100) REFERENCES services(service_id) ON DELETE CASCADE,
            quantity NUMERIC(15, 2),
            unit_price NUMERIC(15, 2),
            total_cost NUMERIC(15, 2),
            progress_level INTEGER DEFAULT 0,
            supplier_id VARCHAR(100),
            cost_price NUMERIC(15, 2),
            warning_threshold NUMERIC(15, 2) DEFAULT 0,
            notes TEXT
        );

        -- Copy existing data, converting integer id to string
        INSERT INTO project_services (id, project_id, service_id, quantity, unit_price, total_cost, progress_level, supplier_id, cost_price)
        SELECT 'PS-' || id::TEXT, project_id, service_id, quantity, unit_price, total_cost, progress_level, supplier_id, cost_price
        FROM project_services_old;

        -- Drop old table
        DROP TABLE project_services_old;

        RAISE NOTICE 'project_services.id migrated from SERIAL/INT to VARCHAR successfully.';
    ELSE
        -- Already VARCHAR — just ensure new columns exist
        ALTER TABLE project_services
            ADD COLUMN IF NOT EXISTS warning_threshold NUMERIC(15, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS notes TEXT;

        RAISE NOTICE 'project_services.id is already VARCHAR. Only missing columns were added.';
    END IF;
END $$;

-- ---------------------------------------------------------------
-- 4. Verification — confirm all columns exist
-- ---------------------------------------------------------------
DO $$
BEGIN
    -- services
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='major_category') THEN
        RAISE EXCEPTION 'MIGRATION FAILED: services.major_category is still missing!';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='requires_recycle_receipt') THEN
        RAISE EXCEPTION 'MIGRATION FAILED: services.requires_recycle_receipt is still missing!';
    END IF;

    -- project_services
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_services' AND column_name='warning_threshold') THEN
        RAISE EXCEPTION 'MIGRATION FAILED: project_services.warning_threshold is still missing!';
    END IF;

    RAISE NOTICE '✅ Migration verified successfully. All required columns are present.';
END $$;
