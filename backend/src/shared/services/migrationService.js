/**
 * GCM Smart Database Migration Service
 * ═════════════════════════════════════════════════════════════════
 * [AR] نظام ترحيل ذكي — يفحص قاعدة البيانات، يقارنها بالمخطط المتوقع،
 *      يحاول الإصلاح التلقائي، ولو فشل يولّد SQL جاهز للتنفيذ اليدوي.
 * [EN] Smart migration system — introspects DB, compares to expected schema,
 *      auto-fixes what it can, generates manual SQL for permission-blocked ops.
 * ═════════════════════════════════════════════════════════════════
 */
const { query } = require('../../../database');
const bcrypt = require('bcryptjs');
const { log } = require('../utils/logger');
const BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

// ═══════════════════════════════════════════════════════════════
// EXPECTED SCHEMA — Single Source of Truth
// Each table defines: columns with their types, and which PK should be VARCHAR
// ═══════════════════════════════════════════════════════════════
const EXPECTED_TABLES = {
    facilities: {
        columns: {
            facility_id: 'varchar', name: 'varchar', type: 'varchar',
            contract_no: 'varchar', contract_file: 'text', contract_start: 'date',
            contract_end: 'date', accepted_services: 'text', location_url: 'text',
            status: "varchar DEFAULT 'ACTIVE'", details: 'text'
        },
        pk: 'facility_id'
    },
    inventory_sizes: {
        columns: { size_id: 'varchar', name: 'varchar', type: 'varchar' },
        pk: 'size_id'
    },
    suppliers: {
        columns: {
            supplier_id: 'varchar', name: 'varchar', details: 'text',
            category: 'varchar', license_no: 'varchar', vat_no: 'varchar',
            bank_name: 'varchar', iban: 'varchar', address: 'text',
            contact_persons: 'text', phone: 'varchar', email: 'varchar',
            website: 'varchar', logo_url: 'text', license_file: 'text',
            vat_file: 'text', agreement_file: 'text',
            status: "varchar DEFAULT 'ACTIVE'", user_id: 'varchar',
            created_at: 'timestamp DEFAULT CURRENT_TIMESTAMP',
            payment_terms: 'text', contract_start: 'date', contract_end: 'date',
            work_start_date: 'date', assigned_projects: 'text', assigned_services: 'text'
        },
        pk: 'supplier_id'
    },
    containers: {
        columns: {
            container_id: 'varchar', code: 'varchar', name: 'varchar',
            status: 'varchar', ownership: 'varchar', size_id: 'varchar',
            project_id: 'varchar', supplier_id: 'varchar', gps_location: 'text',
            doc_file: 'text', supplier_name: 'varchar', purchase_date: 'date',
            maintenance_logs: "jsonb DEFAULT '[]'::jsonb"
        },
        pk: 'container_id'
    },
    tanks: {
        columns: {
            tank_id: 'varchar', code: 'varchar', name: 'varchar',
            status: 'varchar', ownership: 'varchar', size_id: 'varchar',
            project_id: 'varchar', supplier_id: 'varchar', gps_location: 'text',
            doc_file: 'text', supplier_name: 'varchar', purchase_date: 'date',
            maintenance_logs: "jsonb DEFAULT '[]'::jsonb"
        },
        pk: 'tank_id'
    },
    scales: {
        columns: {
            scale_id: 'varchar', code: 'varchar', name: 'varchar',
            status: 'varchar', ownership: 'varchar', size_id: 'varchar',
            project_id: 'varchar', supplier_id: 'varchar', gps_location: 'text',
            doc_file: 'text', supplier_name: 'varchar', purchase_date: 'date',
            maintenance_logs: "jsonb DEFAULT '[]'::jsonb"
        },
        pk: 'scale_id'
    },
    project_supplier_rates: {
        columns: {
            id: 'serial', project_id: 'varchar', supplier_id: 'varchar',
            service_id: 'varchar', cost_price: 'numeric', currency: "varchar DEFAULT 'SAR'"
        },
        pk: 'id'
    },
    environmental_equipments: {
        columns: {
            equipment_id: 'varchar', name_ar: 'varchar', name_en: 'varchar',
            description_ar: 'text', description_en: 'text', image_url: 'text',
            additional_images: "jsonb DEFAULT '[]'::jsonb", catalog_url: 'text',
            data_sheet_url: 'text', specifications: 'text', share_count: 'integer DEFAULT 0',
            status: "varchar DEFAULT 'AVAILABLE'", created_at: 'timestamp DEFAULT CURRENT_TIMESTAMP'
        },
        pk: 'equipment_id'
    },
    equipment_inquiries: {
        columns: {
            id: 'varchar', equipment_id: 'varchar', customer_name: 'varchar',
            email: 'varchar', phone: 'varchar', company: 'varchar',
            message: 'text', admin_reply: 'text', status: "varchar DEFAULT 'PENDING'",
            created_at: 'timestamp DEFAULT CURRENT_TIMESTAMP',
            updated_at: 'timestamp DEFAULT CURRENT_TIMESTAMP'
        },
        pk: 'id', forceVarchar: true
    },
    asset_requests: {
        columns: {
            id: 'serial', supplier_id: 'varchar', type: 'varchar',
            data: "jsonb DEFAULT '{}'::jsonb", status: "varchar DEFAULT 'PENDING'",
            notes: 'text', created_at: 'timestamp DEFAULT CURRENT_TIMESTAMP',
            updated_at: 'timestamp DEFAULT CURRENT_TIMESTAMP'
        },
        pk: 'id'
    },
    contact_submissions: {
        columns: {
            id: 'varchar', name: 'varchar', email: 'varchar', phone: 'varchar',
            company: 'varchar', subject: 'varchar', message: 'text',
            status: "varchar DEFAULT 'PENDING'",
            created_at: 'timestamp DEFAULT CURRENT_TIMESTAMP'
        },
        pk: 'id', forceVarchar: true
    },
    asset_service_links: {
        columns: {
            id: 'serial', asset_type: 'varchar', asset_id: 'varchar',
            service_id: 'varchar', created_at: 'timestamp DEFAULT CURRENT_TIMESTAMP'
        },
        pk: 'id',
        unique: ['asset_type', 'asset_id', 'service_id']
    },
    backup_artifacts: {
        columns: {
            id: 'serial', storage_provider: "varchar DEFAULT 'local'", object_key: 'text',
            local_path: 'text', file_name: 'varchar', format: 'varchar',
            size_bytes: 'bigint', includes_media: 'boolean DEFAULT FALSE',
            created_at: 'timestamp DEFAULT CURRENT_TIMESTAMP'
        },
        pk: 'id'
    },
    backup_job_runs: {
        columns: {
            id: 'serial', idempotency_key: 'varchar', trigger_source: 'varchar',
            status: 'varchar', artifact_id: 'bigint', error_message: 'text',
            requested_at: 'timestamp DEFAULT CURRENT_TIMESTAMP',
            finished_at: 'timestamp'
        },
        pk: 'id'
    }
};

// Columns to ADD to tables that already exist in full_schema.sql
const COLUMN_ADDITIONS = {
    trips: {
        gcm_supervisor_name: 'VARCHAR(255)', facility_id: 'VARCHAR(50)',
        receipt_no: 'VARCHAR(50)', is_manifest_generated: 'BOOLEAN DEFAULT FALSE',
        is_delivery_note_generated: 'BOOLEAN DEFAULT FALSE', assigned_at: 'TIMESTAMP',
        driver_accepted_at: 'TIMESTAMP', priority: 'VARCHAR(50)',
        container_image_before: 'TEXT', container_image_after: 'TEXT',
        client_approved: 'BOOLEAN DEFAULT FALSE', client_approved_at: 'TIMESTAMP',
        request_location_url: 'TEXT', request_container_image: 'TEXT',
        preferred_time: 'VARCHAR(50)', issue_notes: 'TEXT', company_id: 'VARCHAR(100)',
        container_size: 'VARCHAR(50)', hub_link: 'TEXT', supervisor_signature: 'TEXT',
        source: 'VARCHAR(50)', client_signature: 'TEXT', client_stamp: 'TEXT',
        gcm_signature: 'TEXT', gcm_stamp: 'TEXT', inventory_item_id: 'VARCHAR(100)'
    },
    saas_config: {
        template_config: 'TEXT', ai_assistant: 'TEXT',
        management_controls_enabled: 'BOOLEAN DEFAULT TRUE', boot_config: 'TEXT',
        store_page: 'TEXT'
    },
    users: { supplier_id: 'VARCHAR(50)', signature: 'TEXT', stamp: 'TEXT' },
    drivers: {
        user_id: 'VARCHAR(50)', license_expiry: 'DATE', iqama_no: 'VARCHAR(100)',
        iqama_expiry: 'DATE', operating_card_no: 'VARCHAR(100)',
        operating_card_expiry: 'DATE', operating_card_file: 'TEXT',
        insurance_no: 'VARCHAR(100)', insurance_expiry: 'DATE', insurance_file: 'TEXT',
        category: 'VARCHAR(50)', ownership_type: 'VARCHAR(50)', supplier_id: 'VARCHAR(100)',
        role_title: 'VARCHAR(100)', vehicle_id: 'VARCHAR(100)',
        permit_count: 'INTEGER DEFAULT 0', permit_zones: 'TEXT'
    },
    companies: { user_id: 'VARCHAR(50)' },
    projects: { user_id: 'VARCHAR(50)', status: "VARCHAR(50) DEFAULT 'ACTIVE'" },
    vehicles: {
        ownership_type: 'VARCHAR(50)', supplier_id: 'VARCHAR(100)',
        permit_count: 'INTEGER DEFAULT 0', permit_zones: 'TEXT',
        is_small_vehicle: 'BOOLEAN DEFAULT FALSE', documents: 'TEXT',
        photo_front: 'TEXT', photo_back: 'TEXT'
    },
    project_services: {
        supplier_id: 'VARCHAR(100)', cost_price: 'NUMERIC(15, 2)',
        warning_threshold: 'INTEGER DEFAULT 0'
    },
    services: { requires_recycle_receipt: 'BOOLEAN DEFAULT FALSE' },
    environmental_equipments: {
        additional_images: "JSONB DEFAULT '[]'::jsonb", data_sheet_url: 'TEXT',
        share_count: 'INTEGER DEFAULT 0'
    },
    contact_submissions: {
        phone: 'VARCHAR(50)', status: "VARCHAR(50) DEFAULT 'PENDING'",
        created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
    }
};

// Tables whose 'id' column must be VARCHAR instead of SERIAL
const SERIAL_TO_VARCHAR_TABLES = [
    'project_services', 'contact_submissions', 'equipment_inquiries', 'permission_requests'
];

// Performance indexes
const EXPECTED_INDEXES = [
    { name: 'idx_trips_status', table: 'trips', columns: 'status' },
    { name: 'idx_trips_date', table: 'trips', columns: 'date' },
    { name: 'idx_trips_project_id', table: 'trips', columns: 'project_id' },
    { name: 'idx_trips_vehicle_id', table: 'trips', columns: 'vehicle_id' },
    { name: 'idx_trips_driver_id', table: 'trips', columns: 'driver_id' },
    { name: 'idx_trips_company_id', table: 'trips', columns: 'company_id' },
    { name: 'idx_projects_company_id', table: 'projects', columns: 'company_id' },
    { name: 'idx_project_services_project', table: 'project_services', columns: 'project_id' },
    { name: 'idx_activity_logs_entity', table: 'activity_logs', columns: 'entity_id, entity_type' },
    { name: 'idx_activity_logs_timestamp', table: 'activity_logs', columns: 'timestamp DESC' },
    { name: 'idx_users_email', table: 'users', columns: 'email' },
    { name: 'idx_containers_project', table: 'containers', columns: 'project_id' },
    { name: 'idx_asl_asset', table: 'asset_service_links', columns: 'asset_type, asset_id' },
    { name: 'idx_asl_service', table: 'asset_service_links', columns: 'service_id' }
];

// ═══════════════════════════════════════════════════════════════
// LAYER 1: Schema Introspector
// ═══════════════════════════════════════════════════════════════

/** Read actual database state from information_schema */
const introspectDatabase = async () => {
    const tablesResult = await query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const existingTables = new Set(tablesResult.rows.map(r => r.table_name));

    const columnsResult = await query(`
        SELECT table_name, column_name, data_type, column_default, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
    `);

    const tableColumns = {};
    for (const row of columnsResult.rows) {
        if (!tableColumns[row.table_name]) tableColumns[row.table_name] = {};
        tableColumns[row.table_name][row.column_name] = {
            type: row.data_type,
            default: row.column_default,
            nullable: row.is_nullable === 'YES'
        };
    }

    // Check table ownership
    const ownerResult = await query(`
        SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'public'
    `);
    const tableOwners = {};
    for (const row of ownerResult.rows) {
        tableOwners[row.tablename] = row.tableowner;
    }

    const currentUserResult = await query('SELECT current_user');
    const currentUser = currentUserResult.rows[0].current_user;

    // Check existing indexes
    const indexResult = await query(`
        SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
    `);
    const existingIndexes = new Set(indexResult.rows.map(r => r.indexname));

    return { existingTables, tableColumns, tableOwners, currentUser, existingIndexes };
};

// ═══════════════════════════════════════════════════════════════
// LAYER 2: Resilient Migration Runner
// ═══════════════════════════════════════════════════════════════

/** Run a single SQL safely — returns { success, error, sql, label } */
const safeExec = async (sql, label) => {
    try {
        await query(sql);
        return { success: true, label };
    } catch (e) {
        const isPermission = e.code === '42501';
        const isAlreadyDone = e.message.includes('already exists') || e.message.includes('does not exist');
        if (!isAlreadyDone) {
            log(`[MIGRATION ${isPermission ? 'BLOCKED' : 'WARNING'}] ${label}: ${e.message}`);
        }
        return { success: false, label, error: e.message, code: e.code, sql, permissionBlocked: isPermission };
    }
};

const runStartupMigrations = async () => {
    log('[SMART-MIGRATION] ═══ Starting intelligent migration sequence ═══');
    const report = { success: [], failed: [], blocked: [], manualSQL: [] };

    // ── Phase 0: System Users ──
    try {
        const systemPasswordHash = await bcrypt.hash('SYSTEM_ACCOUNT', BCRYPT_ROUNDS);
        await query(
            `INSERT INTO users (id, name, email, password, role) VALUES ('SYSTEM', 'System Administrator', 'system@gcm.local', $1, 'ADMIN') ON CONFLICT (id) DO NOTHING`,
            [systemPasswordHash]
        );
        const email = 'eng-yusuf@gcm-gulf.com';
        const adminPasswordHash = await bcrypt.hash('123', BCRYPT_ROUNDS);
        await query(
            `INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING`,
            ['ADMIN-MASTER', 'Eng. Yusuf (GCM Master)', email, adminPasswordHash, 'ADMIN']
        );
        report.success.push('System users initialized');
    } catch (e) {
        log(`[CRITICAL] System user init failed: ${e.message}`);
        report.failed.push(`System users: ${e.message}`);
    }

    // ── Phase 1: Remove dangerous FK constraints ──
    await safeExec(`DO $$ 
    DECLARE r RECORD;
    BEGIN
        FOR r IN (
            SELECT tc.constraint_name 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND tc.table_name = 'trips' 
              AND kcu.column_name = 'facility_id'
        ) LOOP
            EXECUTE 'ALTER TABLE trips DROP CONSTRAINT ' || quote_ident(r.constraint_name);
        END LOOP;
    END $$`, 'Drop trips.facility_id FK');

    // ── Phase 2: Create missing tables ──
    for (const [tableName, def] of Object.entries(EXPECTED_TABLES)) {
        const colDefs = Object.entries(def.columns).map(([col, type]) => {
            const baseType = type.split(' ')[0].toUpperCase();
            const fullType = type.toUpperCase();
            if (col === def.pk) {
                if (baseType === 'SERIAL') return `"${col}" SERIAL PRIMARY KEY`;
                return `"${col}" VARCHAR(255) PRIMARY KEY`;
            }
            if (baseType === 'VARCHAR') return `"${col}" VARCHAR(255) ${type.includes('DEFAULT') ? type.split('varchar')[1] || '' : ''}`.trim();
            return `"${col}" ${fullType}`;
        });

        let createSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (${colDefs.join(', ')}`;
        if (def.unique) {
            createSQL += `, UNIQUE(${def.unique.join(', ')})`;
        }
        createSQL += ')';

        const result = await safeExec(createSQL, `CREATE ${tableName}`);
        if (result.success) report.success.push(`Table ${tableName} ensured`);
        else if (result.permissionBlocked) {
            report.blocked.push(result);
            report.manualSQL.push(`-- CREATE TABLE ${tableName}\n${createSQL};`);
        }
    }

    // ── Phase 3: Add missing columns to existing tables ──
    let db;
    try {
        db = await introspectDatabase();
    } catch (e) {
        log(`[MIGRATION] Cannot introspect DB: ${e.message}. Falling back to blind mode.`);
        db = null;
    }

    for (const [tableName, columns] of Object.entries(COLUMN_ADDITIONS)) {
        for (const [colName, colType] of Object.entries(columns)) {
            // Skip if introspection shows column already exists
            if (db && db.tableColumns[tableName]?.[colName]) continue;

            const sql = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS "${colName}" ${colType}`;
            const result = await safeExec(sql, `${tableName}.${colName}`);
            if (result.success) {
                report.success.push(`Column ${tableName}.${colName} added`);
            } else if (result.permissionBlocked) {
                report.blocked.push(result);
                report.manualSQL.push(sql + ';');
            }
        }
    }

    // ── Phase 4: Convert SERIAL IDs to VARCHAR where needed ──
    if (db) {
        for (const tableName of SERIAL_TO_VARCHAR_TABLES) {
            const colInfo = db.tableColumns[tableName]?.id;
            if (!colInfo) continue;
            if (colInfo.type === 'integer') {
                // Need to convert integer → varchar
                const sql1 = `ALTER TABLE ${tableName} ALTER COLUMN id DROP DEFAULT`;
                const sql2 = `ALTER TABLE ${tableName} ALTER COLUMN id TYPE VARCHAR(255) USING id::VARCHAR`;
                const r1 = await safeExec(sql1, `${tableName}.id drop default`);
                const r2 = await safeExec(sql2, `${tableName}.id to varchar`);
                if (r1.success && r2.success) {
                    report.success.push(`${tableName}.id converted to VARCHAR`);
                } else if (r1.permissionBlocked || r2.permissionBlocked) {
                    report.blocked.push(r2 || r1);
                    report.manualSQL.push(`-- Convert ${tableName}.id from SERIAL to VARCHAR`);
                    report.manualSQL.push(`${sql1};`);
                    report.manualSQL.push(`${sql2};`);
                }
            } else {
                report.success.push(`${tableName}.id already VARCHAR ✓`);
            }
        }
    } else {
        // Blind mode — try anyway
        for (const tableName of SERIAL_TO_VARCHAR_TABLES) {
            await safeExec(`ALTER TABLE ${tableName} ALTER COLUMN id DROP DEFAULT`, `${tableName}.id drop default`);
            await safeExec(`ALTER TABLE ${tableName} ALTER COLUMN id TYPE VARCHAR(255) USING id::VARCHAR`, `${tableName}.id to varchar`);
        }
    }

    // ── Phase 5: Performance Indexes ──
    const existingIndexes = db?.existingIndexes || new Set();
    for (const idx of EXPECTED_INDEXES) {
        if (existingIndexes.has(idx.name)) continue;
        await safeExec(`CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table}(${idx.columns})`, idx.name);
    }

    // ── Phase 6: Permissions Grant (best-effort) ──
    try {
        const res = await query('SELECT current_user');
        const curr = res.rows[0].current_user;
        await query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${curr}"`);
        await query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${curr}"`);
        report.success.push('Permissions granted');
    } catch (e) {
        log(`[MIGRATION] Permissions grant skipped: ${e.message}`);
    }

    // ── Phase 7: Seed Data (idempotent) ──
    await safeExec(`INSERT INTO environmental_equipments (equipment_id, name_ar, name_en, description_ar, description_en, image_url, status) VALUES 
        ('EQ-01', 'مراقب جودة الهواء الذكي', 'Smart Air Quality Monitor', 'جهاز متطور لرصد ملوثات الهواء بشكل لحظي.', 'Advanced device for real-time air pollutant monitoring.', 'https://images.unsplash.com/photo-1590402485284-a9557a77bb4a?auto=format&fit=crop&q=80', 'AVAILABLE'),
        ('EQ-02', 'مقياس الضجيج الصناعي', 'Industrial Noise Meter', 'مقياس دقيق لمستويات الضوضاء في مواقع العمل.', 'Precision noise level meter for industrial sites.', 'https://images.unsplash.com/photo-1516321165247-4aa89a48be28?auto=format&fit=crop&q=80', 'AVAILABLE')
        ON CONFLICT (equipment_id) DO NOTHING`, 'Seed equipments');

    // ── Final Report ──
    const blockedCount = report.blocked.length;
    const manualCount = report.manualSQL.length;

    if (blockedCount > 0) {
        log(`[SMART-MIGRATION] ⚠️ ${blockedCount} operations blocked by permissions.`);
        log(`[SMART-MIGRATION] 📋 ${manualCount} SQL statements need manual execution via phpPgAdmin.`);
        log(`[SMART-MIGRATION] 🔗 Visit /api/system/schema-health for full report + copy-paste SQL.`);
    } else {
        log('[SMART-MIGRATION] ✅ All migrations completed successfully.');
    }

    log(`[SMART-MIGRATION] ═══ Summary: ${report.success.length} OK, ${blockedCount} blocked ═══`);
    return report;
};

// ═══════════════════════════════════════════════════════════════
// LAYER 3: Health Report Generator
// ═══════════════════════════════════════════════════════════════

const getSchemaHealthReport = async () => {
    const db = await introspectDatabase();
    const issues = [];
    const manualSQL = [];

    // Check 1: Missing tables
    for (const tableName of Object.keys(EXPECTED_TABLES)) {
        if (!db.existingTables.has(tableName)) {
            issues.push({
                severity: 'CRITICAL',
                table: tableName,
                issue: 'Table does not exist',
                fix: 'CREATE TABLE'
            });
            // Generate CREATE TABLE SQL
            const def = EXPECTED_TABLES[tableName];
            const colDefs = Object.entries(def.columns).map(([col, type]) => {
                const baseType = type.split(' ')[0].toUpperCase();
                if (col === def.pk) {
                    if (baseType === 'SERIAL') return `    ${col} SERIAL PRIMARY KEY`;
                    return `    ${col} VARCHAR(255) PRIMARY KEY`;
                }
                if (baseType === 'VARCHAR') return `    ${col} VARCHAR(255)`;
                return `    ${col} ${type.toUpperCase()}`;
            });
            let sql = `CREATE TABLE IF NOT EXISTS ${tableName} (\n${colDefs.join(',\n')}`;
            if (def.unique) sql += `,\n    UNIQUE(${def.unique.join(', ')})`;
            sql += '\n);';
            manualSQL.push(sql);
        }
    }

    // Check 2: Missing columns
    for (const [tableName, columns] of Object.entries(COLUMN_ADDITIONS)) {
        if (!db.existingTables.has(tableName)) continue;
        const existingCols = db.tableColumns[tableName] || {};
        for (const [colName, colType] of Object.entries(columns)) {
            if (!existingCols[colName]) {
                issues.push({
                    severity: 'HIGH',
                    table: tableName,
                    column: colName,
                    issue: 'Column missing',
                    fix: `ADD COLUMN ${colName} ${colType}`
                });
                manualSQL.push(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS "${colName}" ${colType};`);
            }
        }
    }

    // Check 3: SERIAL → VARCHAR conversions needed
    for (const tableName of SERIAL_TO_VARCHAR_TABLES) {
        const colInfo = db.tableColumns[tableName]?.id;
        if (colInfo && colInfo.type === 'integer') {
            issues.push({
                severity: 'CRITICAL',
                table: tableName,
                column: 'id',
                issue: `ID column is INTEGER (SERIAL) but should be VARCHAR — causes 400 errors`,
                fix: 'ALTER COLUMN id TYPE VARCHAR(255)'
            });
            manualSQL.push(`-- Fix ${tableName}.id: INTEGER → VARCHAR`);
            manualSQL.push(`ALTER TABLE ${tableName} ALTER COLUMN id DROP DEFAULT;`);
            manualSQL.push(`ALTER TABLE ${tableName} ALTER COLUMN id TYPE VARCHAR(255) USING id::VARCHAR;`);
        }
    }

    // Check 4: Missing indexes
    for (const idx of EXPECTED_INDEXES) {
        if (!db.existingIndexes.has(idx.name)) {
            issues.push({
                severity: 'LOW',
                table: idx.table,
                issue: `Missing performance index: ${idx.name}`,
                fix: `CREATE INDEX`
            });
            manualSQL.push(`CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table}(${idx.columns});`);
        }
    }

    // Check 5: Ownership issues
    const ownershipIssues = [];
    for (const [table, owner] of Object.entries(db.tableOwners)) {
        if (owner !== db.currentUser) {
            ownershipIssues.push({ table, owner, appUser: db.currentUser });
        }
    }

    // Build final SQL script with grants
    if (manualSQL.length > 0) {
        manualSQL.push('');
        manualSQL.push('-- Grant permissions after changes');
        manualSQL.push('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO CURRENT_USER;');
        manualSQL.push('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO CURRENT_USER;');
    }

    const isHealthy = issues.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH').length === 0;

    return {
        status: isHealthy ? 'HEALTHY' : 'NEEDS_ATTENTION',
        timestamp: new Date().toISOString(),
        database: {
            currentUser: db.currentUser,
            totalTables: db.existingTables.size,
            tablesWithOwnershipMismatch: ownershipIssues.length
        },
        summary: {
            critical: issues.filter(i => i.severity === 'CRITICAL').length,
            high: issues.filter(i => i.severity === 'HIGH').length,
            low: issues.filter(i => i.severity === 'LOW').length,
            total: issues.length
        },
        issues,
        ownershipIssues: ownershipIssues.length > 0 ? ownershipIssues : undefined,
        manualSQL: manualSQL.length > 0 ? manualSQL.join('\n') : null,
        message: isHealthy
            ? '✅ Database schema is fully aligned with application requirements.'
            : '⚠️ Schema differences detected. Copy the SQL below and run it in phpPgAdmin.'
    };
};

module.exports = {
    runStartupMigrations,
    getSchemaHealthReport
};
