const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'gcm_waste',
    password: '123',
    port: 5432,
});

async function runMigrations() {
    try {
        console.log('Connecting to database...');
        await pool.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS source VARCHAR(50)`);
        await pool.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS client_signature TEXT`);
        await pool.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS client_stamp TEXT`);
        
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS signature TEXT`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stamp TEXT`);
        
        console.log('Migration successful.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        process.exit(0);
    }
}

runMigrations();
