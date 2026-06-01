const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const findEnv = () => {
    const p = [
        path.join(__dirname, '../../.env'),
        path.join(__dirname, '../.env'),
        path.join(process.cwd(), '.env'),
        path.join(process.cwd(), 'backend', '.env')
    ];
    for (const f of p) if (fs.existsSync(f)) return f;
    return null;
};
require('dotenv').config({ path: findEnv() });

const pool = new Pool({
    user: process.env.POSTGRES_USER || process.env.PROD_DB_USER || 'postgres',
    host: process.env.POSTGRES_HOST || process.env.PROD_DB_HOST || 'localhost',
    database: process.env.POSTGRES_DB || process.env.PROD_DB_NAME || 'gcm_waste',
    password: process.env.POSTGRES_PASSWORD || process.env.PROD_DB_PASS || '123',
    port: parseInt(process.env.POSTGRES_PORT || process.env.PROD_DB_PORT || '5432'),
});

const reset = async () => {
    const email = 'eng-yusuf@gcm-gulf.com';
    const pass = '123';
    console.log(`Resetting password for ${email} to '${pass}'...`);

    try {
        const hash = await bcrypt.hash(pass, 10);
        const res = await pool.query('UPDATE users SET password = $1, role = $3 WHERE email = $2 RETURNING *', [hash, email, 'ADMIN']);

        if (res.rowCount > 0) {
            console.log(`✅ Success! Updated user: ${res.rows[0].email}`);
            console.log(`New Hash: ${hash}`);
        } else {
            console.log(`❌ User not found: ${email}`);
            // Optional: Create if missing
            console.log('Attempting to create user...');
            const createRes = await pool.query(
                `INSERT INTO users (id, name, email, password, role, company_id, project_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                ['ADMIN-RESET', 'Super Admin', email, hash, 'ADMIN', 'CMP-GLOBAL', 'PRJ-GLOBAL']
            );
            console.log(`✅ Created user: ${createRes.rows[0].email}`);
        }
    } catch (e) {
        console.error('❌ Database Error:', e.message);
    } finally {
        pool.end();
    }
};

reset();
