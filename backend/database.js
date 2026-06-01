const { Pool } = require('pg');
require('dotenv').config();

/**
 * [AR] إعدادات الاتصال بقاعدة البيانات
 * [EN] Database Connection Configuration
 */


let pool;
let dbReadyPromise;

const initializePool = async () => {
    // 1. Check for Standard DATABASE_URL (Top Priority)
    const connectionString = process.env.DATABASE_URL;

    if (connectionString) {
        console.log('--- [DB INFO] Connecting via DATABASE_URL');
        pool = new Pool({
            connectionString: connectionString,
            connectionTimeoutMillis: 10000,
            max: 50,
            idleTimeoutMillis: 30000
        });
    } else {
        console.log('--- [DB INFO] Detected LOCAL/PLAIN NODE Environment');
        const dbConfig = {
            user: process.env.POSTGRES_USER || process.env.PROD_DB_USER,
            host: process.env.POSTGRES_HOST || process.env.PROD_DB_HOST || 'localhost',
            database: process.env.POSTGRES_DB || process.env.PROD_DB_NAME,
            password: process.env.POSTGRES_PASSWORD || process.env.PROD_DB_PASS,
            port: process.env.POSTGRES_PORT || process.env.PROD_DB_PORT || 5432,
            connectionTimeoutMillis: 10000,
            max: 50,
            idleTimeoutMillis: 30000
            // ssl: { rejectUnauthorized: false } // [DISABLED] Server rejected SSL earlier
        };
        console.log(`--- [DB CONFIG] Host: ${dbConfig.host}, DB: ${dbConfig.database}, User: ${dbConfig.user}`);
        pool = new Pool(dbConfig);
    }

    const currentHost = process.env.POSTGRES_HOST || process.env.PROD_DB_HOST || 'localhost';

    // Simple connection check with retry
    const connectWithRetry = async (retries = 10, delay = 3000) => {
        for (let i = 0; i < retries; i++) {
            try {
                console.log(`[DB] Attempting connection to ${currentHost} (Attempt ${i + 1}/${retries})...`);
                const client = await pool.connect();
                console.log(`Connected successfully to database on host: ${currentHost}`);
                client.release();
                return true;
            } catch (err) {
                console.warn(`Database connection failed (Attempt ${i + 1}/${retries}). Retrying in ${delay / 1000}s...`);
                console.error(err.message);
                if (i === retries - 1) {
                    console.error('CRITICAL: Could not connect to database after multiple attempts.');
                    throw err;
                }
                await new Promise(res => setTimeout(res, delay));
            }
        }
    };

    dbReadyPromise = connectWithRetry();

    pool.on('error', (err) => {
        console.error('Unexpected error on idle database client', err);
    });
};

const waitForDb = async () => {
    if (!dbReadyPromise) initializePool();
    return dbReadyPromise;
};

// Initialize immediately
initializePool();

/**
 * [AR] استخدام مخطط البيانات من المصدر الموحد
 * [EN] Use schema from the single source of truth
 */
const { SCHEMA } = require('./src/shared/config/constants');

/**
 * [AR] تنفيذ عمليات متعددة داخل معاملة واحدة (Atomic Transaction)
 * [EN] Execute multiple queries atomically inside a DB transaction.
 * If any query fails, ALL changes are rolled back.
 *
 * Usage:
 *   const { transaction } = require('./database');
 *   await transaction(async (client) => {
 *       await client.query('DELETE FROM child_table WHERE parent_id = $1', [id]);
 *       await client.query('DELETE FROM parent_table WHERE id = $1', [id]);
 *   });
 */
const transaction = async (callback) => {
    if (!pool) throw new Error('Database pool not initialized');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

module.exports = {
    query: async (text, params) => {
        if (!pool) {
            throw new Error('Database pool not initialized');
        }
        try {
            const start = Date.now();
            const res = await pool.query(text, params);
            const duration = Date.now() - start;

            // [PERF] Only log slow queries to reduce I/O overhead
            if (duration > 200) {
                console.warn(`[DB SLOW] ${duration}ms: ${text.substring(0, 100)}...`);
            }

            // [AR] معالجة النتائج المتعددة - [EN] Handle multi-statement results
            const rows = Array.isArray(res) ? (res[res.length - 1]?.rows || []) : (res?.rows || []);

            return res;
        } catch (err) {
            console.error('[DB Error]', err.message, '| SQL:', text);
            throw err;
        }
    },
    transaction,
    pool,
    SCHEMA,
    waitForDb
};
