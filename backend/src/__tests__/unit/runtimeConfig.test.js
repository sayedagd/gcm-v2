describe('runtime config validation', () => {
    const originalEnv = process.env;
    const applyValidProductionEnv = () => {
        process.env.JWT_SECRET = 'test-secret';
        process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/app';
        process.env.NODE_ENV = 'production';
        process.env.PROCESS_ROLE = 'api';
        process.env.AUTH_COOKIE_SECURE = 'true';
        process.env.EVENT_BUS_BROKER = 'redis';
        process.env.REDIS_URL = 'redis://localhost:6379';
        process.env.REDIS_ENABLED = 'true';
        process.env.DB_POOL_MODE = 'auto';
        process.env.DATABASE_POOL_URL = 'postgres://pool-user:pool-pass@localhost:6432/app';
        process.env.BACKUP_STORAGE_PROVIDER = 's3';
        process.env.S3_BACKUP_BUCKET = 'gcm-backups';
        process.env.S3_BACKUP_ACCESS_KEY_ID = 'test-access-key';
        process.env.S3_BACKUP_SECRET_ACCESS_KEY = 'test-secret-key';
    };

    beforeEach(() => {
        process.env = { ...originalEnv };
        process.env.NODE_ENV = 'development';
        delete process.env.ENABLE_RUNTIME_CONFIG_VALIDATION;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('returns no errors when JWT_SECRET and DATABASE_URL are set', () => {
        process.env.JWT_SECRET = 'test-secret';
        process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/app';

        jest.resetModules();
        const { collectRuntimeConfigErrors } = require('../../shared/config/runtimeConfig');

        expect(collectRuntimeConfigErrors()).toEqual([]);
    });

    it('returns missing JWT_SECRET error when absent', () => {
        process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/app';
        delete process.env.JWT_SECRET;

        jest.resetModules();
        const { collectRuntimeConfigErrors } = require('../../shared/config/runtimeConfig');

        expect(collectRuntimeConfigErrors()).toContain('JWT_SECRET is required');
    });

    it('returns missing database config error when no DB env is set', () => {
        process.env.JWT_SECRET = 'test-secret';
        delete process.env.DATABASE_URL;
        delete process.env.POSTGRES_USER;
        delete process.env.POSTGRES_DB;
        delete process.env.POSTGRES_PASSWORD;
        delete process.env.PROD_DB_USER;
        delete process.env.PROD_DB_NAME;
        delete process.env.PROD_DB_PASS;

        jest.resetModules();
        const { collectRuntimeConfigErrors } = require('../../shared/config/runtimeConfig');

        expect(collectRuntimeConfigErrors().join(' ')).toMatch(/Database configuration is required/);
    });

    it('does not throw when validation is disabled by env flag', () => {
        delete process.env.JWT_SECRET;
        delete process.env.DATABASE_URL;
        process.env.ENABLE_RUNTIME_CONFIG_VALIDATION = 'false';

        jest.resetModules();
        const { validateRuntimeConfig } = require('../../shared/config/runtimeConfig');

        expect(() => validateRuntimeConfig()).not.toThrow();
    });

    it('does not throw in test environment', () => {
        delete process.env.JWT_SECRET;
        delete process.env.DATABASE_URL;
        process.env.NODE_ENV = 'test';

        jest.resetModules();
        const { validateRuntimeConfig } = require('../../shared/config/runtimeConfig');

        expect(() => validateRuntimeConfig()).not.toThrow();
    });

    it('throws in non-test mode when critical config is missing', () => {
        delete process.env.JWT_SECRET;
        delete process.env.DATABASE_URL;
        process.env.NODE_ENV = 'production';

        jest.resetModules();
        const { validateRuntimeConfig } = require('../../shared/config/runtimeConfig');

        expect(() => validateRuntimeConfig()).toThrow(/Invalid runtime configuration/);
    });

    it('returns production error when serverless startup jobs are enabled on API role', () => {
        applyValidProductionEnv();
        process.env.ENABLE_SERVERLESS_STARTUP_JOBS = 'true';

        jest.resetModules();
        const { collectRuntimeConfigErrors } = require('../../shared/config/runtimeConfig');

        expect(collectRuntimeConfigErrors()).toContain(
            'ENABLE_SERVERLESS_STARTUP_JOBS must remain false in production when PROCESS_ROLE=api'
        );
    });

    it('returns production error when auth cookie secure flag is not true', () => {
        applyValidProductionEnv();
        process.env.AUTH_COOKIE_SECURE = 'false';

        jest.resetModules();
        const { collectRuntimeConfigErrors } = require('../../shared/config/runtimeConfig');

        expect(collectRuntimeConfigErrors()).toContain('AUTH_COOKIE_SECURE must be true in production');
    });

    it('returns production error when event bus broker is not redis', () => {
        applyValidProductionEnv();
        process.env.EVENT_BUS_BROKER = 'local';

        jest.resetModules();
        const { collectRuntimeConfigErrors } = require('../../shared/config/runtimeConfig');

        expect(collectRuntimeConfigErrors()).toContain('EVENT_BUS_BROKER must be set to "redis" in production');
    });

    it('returns production error when redis url is missing', () => {
        applyValidProductionEnv();
        delete process.env.REDIS_URL;

        jest.resetModules();
        const { collectRuntimeConfigErrors } = require('../../shared/config/runtimeConfig');

        expect(collectRuntimeConfigErrors()).toContain('REDIS_URL is required in production for Redis event bus broker');
    });

    it('returns production error when redis is not enabled', () => {
        applyValidProductionEnv();
        process.env.REDIS_ENABLED = 'false';

        jest.resetModules();
        const { collectRuntimeConfigErrors } = require('../../shared/config/runtimeConfig');

        expect(collectRuntimeConfigErrors()).toContain('REDIS_ENABLED must be true in production for Redis-backed runtime services');
    });

    it('returns error when DB_POOL_MODE is invalid', () => {
        process.env.JWT_SECRET = 'test-secret';
        process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/app';
        process.env.DB_POOL_MODE = 'invalid-mode';

        jest.resetModules();
        const { collectRuntimeConfigErrors } = require('../../shared/config/runtimeConfig');

        expect(collectRuntimeConfigErrors()).toContain('DB_POOL_MODE must be one of: auto, pgbouncer, direct');
    });

    it('returns production error when managed pool url is missing', () => {
        applyValidProductionEnv();
        delete process.env.DATABASE_POOL_URL;

        jest.resetModules();
        const { collectRuntimeConfigErrors } = require('../../shared/config/runtimeConfig');

        expect(collectRuntimeConfigErrors()).toContain('DATABASE_POOL_URL is required in production for managed DB pooling');
    });

    it('returns production error when DB_POOL_MODE is direct', () => {
        applyValidProductionEnv();
        process.env.DB_POOL_MODE = 'direct';

        jest.resetModules();
        const { collectRuntimeConfigErrors } = require('../../shared/config/runtimeConfig');

        expect(collectRuntimeConfigErrors()).toContain('DB_POOL_MODE must not be "direct" in production');
    });

    it('returns production error when backup storage provider is not s3', () => {
        applyValidProductionEnv();
        process.env.BACKUP_STORAGE_PROVIDER = 'local';

        jest.resetModules();
        const { collectRuntimeConfigErrors } = require('../../shared/config/runtimeConfig');

        expect(collectRuntimeConfigErrors()).toContain('BACKUP_STORAGE_PROVIDER must be set to "s3" in production');
    });

    it('returns production error when required s3 backup vars are missing', () => {
        applyValidProductionEnv();
        delete process.env.S3_BACKUP_BUCKET;
        delete process.env.S3_BACKUP_ACCESS_KEY_ID;
        delete process.env.S3_BACKUP_SECRET_ACCESS_KEY;

        jest.resetModules();
        const { collectRuntimeConfigErrors } = require('../../shared/config/runtimeConfig');

        expect(collectRuntimeConfigErrors()).toContain(
            'S3_BACKUP_BUCKET is required in production when BACKUP_STORAGE_PROVIDER=s3'
        );
        expect(collectRuntimeConfigErrors()).toContain(
            'S3_BACKUP_ACCESS_KEY_ID is required in production when BACKUP_STORAGE_PROVIDER=s3'
        );
        expect(collectRuntimeConfigErrors()).toContain(
            'S3_BACKUP_SECRET_ACCESS_KEY is required in production when BACKUP_STORAGE_PROVIDER=s3'
        );
    });
});
