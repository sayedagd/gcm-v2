const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config();
const metricsService = require('./src/shared/services/metricsService');
const observeDbQuery = metricsService.observeDbQuery || (() => {});
const { logEvent } = require('./src/shared/utils/logger');

/**
 * [AR] إعدادات الاتصال بقاعدة البيانات
 * [EN] Database Connection Configuration
 */


let pool;
let dbReadyPromise;
const runtimeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
const processRole = (process.env.PROCESS_ROLE || 'api').toLowerCase();
const SLOW_QUERY_THRESHOLD_MS = Number.parseInt(process.env.DB_SLOW_QUERY_MS || '200', 10);
const DB_POOL_MODE = process.env.DB_POOL_MODE || 'auto';
const toPositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const poolProfileDefaults = {
    production: { api: 35, worker: 20, idleMs: 20000, connTimeoutMs: 8000 },
    staging: { api: 30, worker: 18, idleMs: 25000, connTimeoutMs: 9000 },
    development: { api: 50, worker: 30, idleMs: 30000, connTimeoutMs: 10000 },
    test: { api: 50, worker: 30, idleMs: 30000, connTimeoutMs: 10000 },
};

const selectedProfile = poolProfileDefaults[runtimeEnv] || poolProfileDefaults.development;
const fallbackPoolMax = processRole === 'worker' ? selectedProfile.worker : selectedProfile.api;
const DB_POOL_MAX = toPositiveInt(process.env.DB_POOL_MAX, fallbackPoolMax);
const DB_POOL_IDLE_MS = toPositiveInt(process.env.DB_POOL_IDLE_MS, selectedProfile.idleMs);
const DB_POOL_CONN_TIMEOUT_MS = toPositiveInt(process.env.DB_POOL_CONN_TIMEOUT_MS, selectedProfile.connTimeoutMs);
const DB_MAX_CONNECTIONS = Number.parseInt(process.env.DB_MAX_CONNECTIONS || '0', 10);
const DB_RESERVED_CONNECTIONS = Number.parseInt(process.env.DB_RESERVED_CONNECTIONS || '0', 10);
const API_INSTANCE_COUNT = Number.parseInt(process.env.API_INSTANCE_COUNT || '0', 10);
const WORKER_INSTANCE_COUNT = Number.parseInt(process.env.WORKER_INSTANCE_COUNT || '0', 10);

const logPoolSizingAdvisory = () => {
    if (DB_MAX_CONNECTIONS <= 0) return;

    const totalInstances = Math.max(1, API_INSTANCE_COUNT + WORKER_INSTANCE_COUNT);
    const availableConnections = Math.max(1, DB_MAX_CONNECTIONS - Math.max(0, DB_RESERVED_CONNECTIONS));
    const perInstanceBudget = Math.max(1, Math.floor(availableConnections / totalInstances));

    if (DB_POOL_MAX > perInstanceBudget) {
        console.warn(
            `[DB] DB_POOL_MAX=${DB_POOL_MAX} exceeds per-instance budget=${perInstanceBudget} ` +
            `(DB_MAX_CONNECTIONS=${DB_MAX_CONNECTIONS}, RESERVED=${DB_RESERVED_CONNECTIONS}, INSTANCES=${totalInstances}).`
        );
    }
};

const resolveConnectionString = () => {
    const pooledUrl = typeof process.env.DATABASE_POOL_URL === 'string' ? process.env.DATABASE_POOL_URL.trim() : null;
    const directUrl = typeof process.env.DATABASE_URL === 'string' ? process.env.DATABASE_URL.trim() : null;

    if (DB_POOL_MODE === 'pgbouncer' && pooledUrl) {
        return { connectionString: pooledUrl, source: 'DATABASE_POOL_URL' };
    }

    if (DB_POOL_MODE === 'direct' && directUrl) {
        return { connectionString: directUrl, source: 'DATABASE_URL' };
    }

    if (DB_POOL_MODE === 'auto' && pooledUrl) {
        return { connectionString: pooledUrl, source: 'DATABASE_POOL_URL' };
    }

    if (directUrl) {
        return { connectionString: directUrl, source: 'DATABASE_URL' };
    }

    return { connectionString: null, source: null };
};

const normalizeSql = (text = '') => {
    return String(text)
        .replace(/'([^'\\]|\\.)*'/g, '?')
        .replace(/\b\d+(\.\d+)?\b/g, '?')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
};

const fingerprintSql = (text = '') => {
    const normalized = normalizeSql(text);
    const hash = crypto.createHash('sha1').update(normalized).digest('hex').slice(0, 12);
    return { normalized, fingerprint: hash };
};

const initializePool = () => {
    if (pool) {
        return;
    }

    logPoolSizingAdvisory();

    const { connectionString, source } = resolveConnectionString();

    if (connectionString) {
        console.log(
            `--- [DB INFO] Connecting via ${source} (mode=${DB_POOL_MODE}, env=${runtimeEnv}, role=${processRole}, max=${DB_POOL_MAX})`
        );
        pool = new Pool({
            connectionString: connectionString,
            connectionTimeoutMillis: DB_POOL_CONN_TIMEOUT_MS,
            max: DB_POOL_MAX,
            idleTimeoutMillis: DB_POOL_IDLE_MS
        });
    } else {
        console.log('--- [DB INFO] Detected LOCAL/PLAIN NODE Environment');
        const dbConfig = {
            user: process.env.POSTGRES_USER || process.env.PROD_DB_USER,
            host: process.env.POSTGRES_HOST || process.env.PROD_DB_HOST || 'localhost',
            database: process.env.POSTGRES_DB || process.env.PROD_DB_NAME,
            password: process.env.POSTGRES_PASSWORD || process.env.PROD_DB_PASS,
            port: process.env.POSTGRES_PORT || process.env.PROD_DB_PORT || 5432,
            connectionTimeoutMillis: DB_POOL_CONN_TIMEOUT_MS,
            max: DB_POOL_MAX,
            idleTimeoutMillis: DB_POOL_IDLE_MS
            // ssl: { rejectUnauthorized: false } // [DISABLED] Server rejected SSL earlier
        };
        console.log(`--- [DB CONFIG] Host: ${dbConfig.host}, DB: ${dbConfig.database}, User: ${dbConfig.user}`);
        pool = new Pool(dbConfig);
    }

    const currentHost = process.env.POSTGRES_HOST || process.env.PROD_DB_HOST || 'localhost';

    pool.on('error', (err) => {
        console.error('Unexpected error on idle database client', err);
    });
};

const connectWithRetry = async (retries = 10, delay = 3000) => {
    const currentHost = process.env.POSTGRES_HOST || process.env.PROD_DB_HOST || 'localhost';

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

const waitForDb = async () => {
    if (!pool) {
        initializePool();
    }
    if (!dbReadyPromise) {
        dbReadyPromise = connectWithRetry();
    }
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
    query: async (text, params = [], options = {}) => {
        if (!pool) {
            throw new Error('Database pool not initialized');
        }
        try {
            const start = Date.now();
            const res = await pool.query(text, params);
            const duration = Date.now() - start;
            const { fingerprint } = fingerprintSql(text);
            const isSlow = duration >= SLOW_QUERY_THRESHOLD_MS;
            observeDbQuery({
                durationMs: duration,
                queryTag: options.queryTag || null,
                queryFingerprint: fingerprint,
                isSlow,
            });

            // [PERF] Only log slow queries to reduce I/O overhead
            if (isSlow && !options.suppressSlowLog) {
                logEvent('db_slow_query', {
                    durationMs: duration,
                    thresholdMs: SLOW_QUERY_THRESHOLD_MS,
                    queryFingerprint: fingerprint,
                    queryTag: options.queryTag || null,
                    rowCount: res?.rowCount ?? null,
                });
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
