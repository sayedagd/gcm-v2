const db = require('../../database');
const bcrypt = require('bcryptjs');

async function createTestAccounts() {
    console.log("Starting test account creation...");

    const passwordHash = '$2a$10$gHbnHAp/SNLrZBBHRc.RQ4lpmPb6jA.4CWqTy0PTD0zar.8H'; // Password '123'

    try {
        // 1. Create Dummy Dependencies
        console.log("Creating dummy company, project, and supplier...");

        await db.query(`
            INSERT INTO companies (company_id, company_name) 
            VALUES ('CMP-GCM', 'GCM Main Company') 
            ON CONFLICT (company_id) DO NOTHING
        `);

        await db.query(`
            INSERT INTO projects (project_id, project_name, company_id) 
            VALUES ('PRJ-GCM', 'GCM Internal Project', 'CMP-GCM') 
            ON CONFLICT (project_id) DO NOTHING
        `);

        await db.query(`
            INSERT INTO suppliers (supplier_id, name) 
            VALUES ('SUP-GCM', 'GCM Main Supplier') 
            ON CONFLICT (supplier_id) DO NOTHING
        `);

        const roles = [
            { id: 'U_ADMIN_TEST', name: 'Test Admin', email: 'admin@gcm.com', role: 'ADMIN' },
            { id: 'U_USER_TEST', name: 'Test User', email: 'user@gcm.com', role: 'USER' },
            { id: 'U_COMPANY_USER_TEST', name: 'Test Company User', email: 'company@gcm.com', role: 'COMPANY_USER', company_id: 'CMP-GCM' },
            { id: 'U_PROJECT_USER_TEST', name: 'Test Project User', email: 'project@gcm.com', role: 'PROJECT_USER', project_id: 'PRJ-GCM' },
            { id: 'U_ACCOUNTANT_TEST', name: 'Test Accountant', email: 'accountant@gcm.com', role: 'ACCOUNTANT' },
            { id: 'U_DATA_ENTRY_TEST', name: 'Test Data Entry', email: 'dataentry@gcm.com', role: 'DATA_ENTRY' },
            { id: 'U_REPORTS_MANAGER_TEST', name: 'Test Reports Manager', email: 'reports@gcm.com', role: 'REPORTS_MANAGER' },
            { id: 'U_LOGISTICS_TEST', name: 'Test Logistics', email: 'logistics@gcm.com', role: 'LOGISTICS' },
            { id: 'U_DRIVER_TEST', name: 'Test Driver', email: 'driver@gcm.com', role: 'DRIVER' },
            { id: 'U_CLIENT_TEST', name: 'Test Client', email: 'client@gcm.com', role: 'CLIENT', company_id: 'CMP-GCM' },
            { id: 'U_SUBCONTRACTOR_TEST', name: 'Test Subcontractor', email: 'sub@gcm.com', role: 'SUBCONTRACTOR', supplier_id: 'SUP-GCM' },
        ];

        for (const u of roles) {
            const query = `
                INSERT INTO users (id, name, email, password, role, company_id, project_id, supplier_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (id) 
                DO UPDATE SET 
                    name = EXCLUDED.name,
                    email = EXCLUDED.email,
                    password = EXCLUDED.password,
                    role = EXCLUDED.role,
                    company_id = EXCLUDED.company_id,
                    project_id = EXCLUDED.project_id,
                    supplier_id = EXCLUDED.supplier_id
            `;
            await db.query(query, [
                u.id,
                u.name,
                u.email,
                passwordHash,
                u.role,
                u.company_id || null,
                u.project_id || null,
                u.supplier_id || null
            ]);
            console.log(`Created/Updated account for role: ${u.role} (${u.email})`);
        }

        console.log("All test accounts created successfully. Password for all is '123'");
        process.exit(0);

    } catch (err) {
        console.error("Error creating test accounts:", err);
        process.exit(1);
    }
}

setTimeout(createTestAccounts, 1000);
