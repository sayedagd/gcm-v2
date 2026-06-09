const { defineConfig } = require('drizzle-kit');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });

const connectionString = process.env.DATABASE_URL
    || `postgresql://${process.env.POSTGRES_USER || process.env.PROD_DB_USER}:${process.env.POSTGRES_PASSWORD || process.env.PROD_DB_PASS}@${process.env.POSTGRES_HOST || process.env.PROD_DB_HOST || 'localhost'}:${process.env.POSTGRES_PORT || process.env.PROD_DB_PORT || 5432}/${process.env.POSTGRES_DB || process.env.PROD_DB_NAME}`;

module.exports = defineConfig({
    dialect: 'postgresql',
    schema: './src/shared/db/drizzle/schema.js',
    out: './drizzle',
    dbCredentials: {
        url: connectionString,
    },
    strict: true,
    verbose: true,
});
