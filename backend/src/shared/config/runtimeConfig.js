const hasValue = (value) => typeof value === 'string' && value.trim().length > 0;
const getEnvValue = (key) => {
    const value = process.env[key];
    return typeof value === 'string' ? value.trim() : value;
};
const DB_POOL_MODES = new Set(['auto', 'pgbouncer', 'direct']);

const isPositiveInteger = (value) => {
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) && parsed > 0;
};

const hasDatabaseUrl = () => hasValue(process.env.DATABASE_URL);

const hasPostgresCredentials = () => {
    const user = process.env.POSTGRES_USER || process.env.PROD_DB_USER;
    const dbName = process.env.POSTGRES_DB || process.env.PROD_DB_NAME;
    const password = process.env.POSTGRES_PASSWORD || process.env.PROD_DB_PASS;

    return hasValue(user) && hasValue(dbName) && hasValue(password);
};

const collectRuntimeConfigErrors = () => {
    const errors = [];
    const processRole = process.env.PROCESS_ROLE || 'api';

    if (!hasValue(process.env.JWT_SECRET)) {
        errors.push('JWT_SECRET is required');
    }

    if (!hasDatabaseUrl() && !hasPostgresCredentials()) {
        errors.push('Database configuration is required: set DATABASE_URL or POSTGRES_USER/POSTGRES_DB/POSTGRES_PASSWORD (or PROD_DB_* equivalents)');
    }

    if (!['api', 'worker'].includes(processRole)) {
        errors.push('PROCESS_ROLE must be either "api" or "worker"');
    }

    const poolMode = (process.env.DB_POOL_MODE || 'auto').toLowerCase();
    const poolUrl = getEnvValue('DATABASE_POOL_URL');
    if (!DB_POOL_MODES.has(poolMode)) {
        errors.push('DB_POOL_MODE must be one of: auto, pgbouncer, direct');
    }

    if (poolMode === 'pgbouncer' && !hasValue(poolUrl)) {
        errors.push('DATABASE_POOL_URL is required when DB_POOL_MODE=pgbouncer');
    }

    for (const key of ['DB_POOL_MAX', 'DB_POOL_IDLE_MS', 'DB_POOL_CONN_TIMEOUT_MS']) {
        if (hasValue(process.env[key]) && !isPositiveInteger(process.env[key])) {
            errors.push(`${key} must be a positive integer when set`);
        }
    }

    const runsInProcessJobs = process.env.ENABLE_IN_PROCESS_JOBS === 'true';
    const runsInProcessCron = process.env.ENABLE_IN_PROCESS_CRON === 'true';
    const runsWhatsApp = process.env.ENABLE_WHATSAPP === 'true';
    const runsServerlessStartupJobs = process.env.ENABLE_SERVERLESS_STARTUP_JOBS === 'true';
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction && processRole === 'api') {
        if (runsInProcessJobs) {
            errors.push('ENABLE_IN_PROCESS_JOBS must remain false in production when PROCESS_ROLE=api');
        }

        if (runsInProcessCron) {
            errors.push('ENABLE_IN_PROCESS_CRON must remain false in production when PROCESS_ROLE=api');
        }

        if (runsWhatsApp) {
            errors.push('ENABLE_WHATSAPP must remain false in production when PROCESS_ROLE=api');
        }

        if (runsServerlessStartupJobs) {
            errors.push('ENABLE_SERVERLESS_STARTUP_JOBS must remain false in production when PROCESS_ROLE=api');
        }
    }

    if (isProduction && getEnvValue('AUTH_COOKIE_SECURE') !== 'true') {
        errors.push('AUTH_COOKIE_SECURE must be true in production');
    }

    if (isProduction && !hasValue(poolUrl)) {
        errors.push('DATABASE_POOL_URL is required in production for managed DB pooling');
    }

    if (isProduction && poolMode === 'direct') {
        errors.push('DB_POOL_MODE must not be "direct" in production');
    }

    if (isProduction && getEnvValue('EVENT_BUS_BROKER') !== 'redis') {
        errors.push('EVENT_BUS_BROKER must be set to "redis" in production');
    }

    if (isProduction && !hasValue(getEnvValue('REDIS_URL'))) {
        errors.push('REDIS_URL is required in production for Redis event bus broker');
    }

    if (isProduction && getEnvValue('REDIS_ENABLED') !== 'true') {
        errors.push('REDIS_ENABLED must be true in production for Redis-backed runtime services');
    }

    const backupStorageProvider = (getEnvValue('BACKUP_STORAGE_PROVIDER') || '').toLowerCase();
    if (isProduction && backupStorageProvider !== 's3') {
        errors.push('BACKUP_STORAGE_PROVIDER must be set to "s3" in production');
    }

    if (isProduction && backupStorageProvider === 's3') {
        if (!hasValue(getEnvValue('S3_BACKUP_BUCKET'))) {
            errors.push('S3_BACKUP_BUCKET is required in production when BACKUP_STORAGE_PROVIDER=s3');
        }
        if (!hasValue(getEnvValue('S3_BACKUP_ACCESS_KEY_ID'))) {
            errors.push('S3_BACKUP_ACCESS_KEY_ID is required in production when BACKUP_STORAGE_PROVIDER=s3');
        }
        if (!hasValue(getEnvValue('S3_BACKUP_SECRET_ACCESS_KEY'))) {
            errors.push('S3_BACKUP_SECRET_ACCESS_KEY is required in production when BACKUP_STORAGE_PROVIDER=s3');
        }
    }

    return errors;
};

const validateRuntimeConfig = () => {
    if (process.env.NODE_ENV === 'test') {
        return;
    }

    if (process.env.ENABLE_RUNTIME_CONFIG_VALIDATION === 'false') {
        return;
    }

    const errors = collectRuntimeConfigErrors();
    if (errors.length === 0) {
        return;
    }

    throw new Error(`[CONFIG] Invalid runtime configuration: ${errors.join(' | ')}`);
};

module.exports = {
    validateRuntimeConfig,
    collectRuntimeConfigErrors,
};
