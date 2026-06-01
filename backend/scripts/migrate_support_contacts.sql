-- Run this script on the production database using psql or phpPgAdmin to add the missing support columns
ALTER TABLE saas_config ADD COLUMN IF NOT EXISTS support_phone VARCHAR(50);
ALTER TABLE saas_config ADD COLUMN IF NOT EXISTS support_whatsapp VARCHAR(50);
