const db = require('../../database');

async function wipeData() {
    console.log("Starting robust data wipe (Preserving users, services, and config)...");

    const potentialTables = [
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
        'permission_requests'
    ];

    try {
        // 1. Identify which tables actually exist to avoid "relation does not exist" errors
        const existingTables = [];
        for (const table of potentialTables) {
            try {
                await db.query(`SELECT 1 FROM ${table} LIMIT 1;`);
                existingTables.push(table);
            } catch (e) {
                // Table doesn't exist, skip it
            }
        }

        console.log(`Verified tables for deletion: ${existingTables.join(', ')}`);

        // 2. Remove dependencies in the users table so we can truncate companies/projects/suppliers
        console.log("Nullifying foreign key references in users table...");
        await db.query(`UPDATE users SET company_id = NULL, project_id = NULL, supplier_id = NULL;`);

        // 3. Perform a cascaded truncate on all identified tables
        if (existingTables.length > 0) {
            const query = `TRUNCATE TABLE ${existingTables.join(', ')} CASCADE;`;
            console.log("Executing Truncate...");
            await db.query(query);
            console.log("Master and transactional data wiped successfully.");
        } else {
            console.log("No matching tables found to wipe.");
        }

        console.log("Preserved: users, services, saas_config");
        process.exit(0);

    } catch (err) {
        console.error("Critical error during data wipe:", err.message);
        process.exit(1);
    }
}

// Small delay to allow DB pool to stabilize
setTimeout(wipeData, 1000);
