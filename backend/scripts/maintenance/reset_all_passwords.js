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

const envPath = findEnv();
if (envPath) {
    console.log(`Loading environment from: ${envPath}`);
    require('dotenv').config({ path: envPath });
} else {
    console.error('❌ Could not find .env file!');
    process.exit(1);
}

// Connect using the DATABASE_URL (or POSTGRES_URL) or discrete parameters
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const poolConfig = connectionString ? {
    connectionString,
    ssl: { rejectUnauthorized: false } // using rejectUnauthorized false to avoid SSL handshake issues on local connections to Neon
} : {
    user: process.env.POSTGRES_USER || process.env.PROD_DB_USER || 'postgres',
    host: process.env.POSTGRES_HOST || process.env.PROD_DB_HOST || 'localhost',
    database: process.env.POSTGRES_DB || process.env.PROD_DB_NAME || 'gcm_waste',
    password: process.env.POSTGRES_PASSWORD || process.env.PROD_DB_PASS || '123',
    port: parseInt(process.env.POSTGRES_PORT || process.env.PROD_DB_PORT || '5432'),
};

const pool = new Pool(poolConfig);

const resetAllPasswords = async () => {
    const targetPassword = 'password123';
    console.log('--- Database User Password Reset Tool ---');
    
    try {
        // 1. Fetch all users from DB
        console.log('Fetching users from the database...');
        const fetchRes = await pool.query('SELECT id, name, email, role, status FROM users');
        const users = fetchRes.rows;
        
        if (users.length === 0) {
            console.log('No users found in the database.');
            return;
        }

        console.log(`Found ${users.length} users:`);
        users.forEach(user => {
            console.log(` - ID: ${user.id} | Name: ${user.name} | Email: ${user.email} | Role: ${user.role} | Status: ${user.status}`);
        });

        // 2. Hash target password
        console.log(`\nGenerating bcrypt hash for password: "${targetPassword}"...`);
        const saltRounds = 10;
        const hash = await bcrypt.hash(targetPassword, saltRounds);
        console.log(`Hash generated: ${hash}`);

        // 3. Update all users' passwords
        console.log('\nUpdating passwords for all users...');
        const updateRes = await pool.query('UPDATE users SET password = $1 RETURNING id, email', [hash]);
        
        console.log(`✅ Success! Updated ${updateRes.rowCount} users in the database.`);
        updateRes.rows.forEach(row => {
            console.log(`Updated password for: ${row.email}`);
        });

    } catch (error) {
        console.error('❌ Error occurred during operation:', error);
    } finally {
        await pool.end();
        console.log('Database connection closed.');
    }
};

resetAllPasswords();
