const { query } = require('../../database');

async function fixTrips() {
    try {
        console.log('Adding missing columns to trips table...');
        await query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS source VARCHAR(50)`);
        await query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS client_signature TEXT`);
        await query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS client_stamp TEXT`);
        console.log('Columns added successfully.');
    } catch (e) {
        console.error('Error adding columns:', e);
    } finally {
        process.exit(0);
    }
}

fixTrips();
