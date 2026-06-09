const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');

const buildConnectionString = () => {
    if (process.env.DATABASE_URL) {
        return process.env.DATABASE_URL;
    }

    const user = process.env.POSTGRES_USER || process.env.PROD_DB_USER;
    const password = process.env.POSTGRES_PASSWORD || process.env.PROD_DB_PASS;
    const host = process.env.POSTGRES_HOST || process.env.PROD_DB_HOST || 'localhost';
    const port = process.env.POSTGRES_PORT || process.env.PROD_DB_PORT || 5432;
    const database = process.env.POSTGRES_DB || process.env.PROD_DB_NAME;

    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
};

const pool = new Pool({
    connectionString: buildConnectionString(),
    connectionTimeoutMillis: 10000,
    max: 20,
    idleTimeoutMillis: 30000,
});

const db = drizzle(pool);

module.exports = {
    db,
    drizzlePool: pool,
};
