/**
 * [AR] سكريبت تنظيف قاعدة البيانات للتيست بداتا حقيقية
 * [EN] Database Reset Script — Preserves services tree + one admin user
 * 
 * PRESERVES:
 *   - services (all parent + sub-services)
 *   - saas_config
 *   - user: eng-yusuf@gcm-gulf.com (password: 123)
 * 
 * DELETES EVERYTHING ELSE:
 *   - trips, projects, companies, drivers, vehicles, containers, tanks, scales,
 *     inventory_sizes, suppliers, facilities, logs, notifications, permission_requests,
 *     project_services, contact_submissions, equipment, asset_requests, asset_service_links,
 *     ALL other users
 */

const db = require('../../database');

const KEEP_EMAIL = 'eng-yusuf@gcm-gulf.com';
const KEEP_PASSWORD = '123'; // Plain text — backend uses direct string comparison

async function resetForTesting() {
    console.log('='.repeat(60));
    console.log('  GCM DATABASE RESET FOR REAL-DATA TESTING');
    console.log('='.repeat(60));
    console.log(`\n  PRESERVING: services, saas_config, user: ${KEEP_EMAIL}`);
    console.log('  DELETING:   everything else\n');

    try {
        // Wait for DB connection
        await db.waitForDb();

        // ── Step 1: Tables to wipe (order matters for FK constraints) ──
        const tablesToWipe = [
            'trips',
            'project_services',
            'project_supplier_rates',
            'projects',
            'companies',
            'vehicles',
            'drivers',
            'containers',
            'tanks',
            'scales',
            'inventory_sizes',
            'suppliers',
            'facilities',
            'activity_logs',
            'notifications',
            'alerts',
            'documents',
            'maintenance',
            'contact_submissions',
            'permission_requests',
            'equipment',
            'equipment_inquiries',
            'asset_requests',
            'asset_service_links',
        ];

        // ── Step 2: Check which tables exist ──
        const existingTables = [];
        for (const table of tablesToWipe) {
            try {
                await db.query(`SELECT 1 FROM ${table} LIMIT 1;`);
                existingTables.push(table);
            } catch {
                // Table doesn't exist, skip
            }
        }
        console.log(`[1/5] Found ${existingTables.length} tables to wipe: ${existingTables.join(', ')}`);

        // ── Step 3: Nullify FK references in users before wiping master data ──
        console.log('[2/5] Nullifying foreign key references in users...');
        await db.query(`UPDATE users SET company_id = NULL, project_id = NULL, supplier_id = NULL;`);

        // ── Step 4: Truncate all data tables (cascade) ──
        if (existingTables.length > 0) {
            const truncateQuery = `TRUNCATE TABLE ${existingTables.join(', ')} CASCADE;`;
            console.log('[3/5] Truncating all data tables...');
            await db.query(truncateQuery);
            console.log('      ✅ All transactional/master data wiped.');
        }

        // ── Step 5: Delete all users EXCEPT the preserved one ──
        console.log(`[4/5] Deleting all users except ${KEEP_EMAIL}...`);
        const deleteResult = await db.query(`DELETE FROM users WHERE email != $1;`, [KEEP_EMAIL]);
        console.log(`      ✅ Deleted ${deleteResult.rowCount} users.`);

        // ── Step 6: Reset the preserved user's password and ensure admin role ──
        console.log(`[5/5] Resetting ${KEEP_EMAIL} password and ensuring ADMIN role...`);
        await db.query(
            `UPDATE users SET 
                password = $1, 
                role = 'ADMIN', 
                company_id = NULL, 
                project_id = NULL, 
                supplier_id = NULL,
                signature = NULL,
                stamp = NULL
             WHERE email = $2;`,
            [KEEP_PASSWORD, KEEP_EMAIL]
        );

        // Verify the user exists
        const userCheck = await db.query(`SELECT id, name, email, role FROM users WHERE email = $1;`, [KEEP_EMAIL]);
        if (userCheck.rows.length === 0) {
            console.log(`\n⚠️  User ${KEEP_EMAIL} not found. Creating it now...`);
            const newId = `USR-${Date.now()}`;
            await db.query(
                `INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, 'ADMIN');`,
                [newId, 'Eng. Yusuf', KEEP_EMAIL, KEEP_PASSWORD]
            );
            console.log(`      ✅ Created user: ${KEEP_EMAIL} (ID: ${newId})`);
        } else {
            const u = userCheck.rows[0];
            console.log(`      ✅ User verified: ${u.name} (${u.email}) — Role: ${u.role}`);
        }

        // ── Final Report ──
        const servicesCount = await db.query(`SELECT COUNT(*) as count FROM services;`);
        const usersCount = await db.query(`SELECT COUNT(*) as count FROM users;`);

        console.log('\n' + '='.repeat(60));
        console.log('  ✅ RESET COMPLETE');
        console.log('='.repeat(60));
        console.log(`  Services preserved: ${servicesCount.rows[0].count}`);
        console.log(`  Users remaining:    ${usersCount.rows[0].count}`);
        console.log(`  Login:              ${KEEP_EMAIL} / ${KEEP_PASSWORD}`);
        console.log('='.repeat(60));

        process.exit(0);
    } catch (err) {
        console.error('\n❌ CRITICAL ERROR:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

// Allow DB pool to stabilize
setTimeout(resetForTesting, 1500);
