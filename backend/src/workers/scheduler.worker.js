/**
 * Dedicated scheduler worker runtime.
 * Runs cron-like jobs outside API process.
 */
const path = require('path');
const dotenv = require('dotenv');
const { initBackupScheduler, processPendingBackupJobs } = require('../shared/services/backupService');
const dbModule = require('../../database');
const { log } = require('../shared/utils/logger');
const { createWorkerHealthServer } = require('./workerHealth');

const findEnv = () => {
    const envPath = path.join(__dirname, '..', '..', '.env');
    return envPath;
};

dotenv.config({ path: findEnv() });

process.env.PROCESS_ROLE = process.env.PROCESS_ROLE || 'worker';
process.env.ENABLE_IN_PROCESS_CRON = process.env.ENABLE_IN_PROCESS_CRON || 'true';

const waitForDb = dbModule.waitForDb || (async () => {});
const pollMs = Number.parseInt(process.env.BACKUP_WORKER_POLL_MS || '5000', 10);
let pollTimer = null;
const health = createWorkerHealthServer({
    workerName: 'SCHEDULER-WORKER',
    portEnvVar: 'SCHEDULER_WORKER_HEALTH_PORT',
    defaultPort: 9292,
    log,
});

const start = async () => {
    try {
        await waitForDb();
        initBackupScheduler();
        pollTimer = setInterval(async () => {
            try {
                const processed = await processPendingBackupJobs();
                if (processed && processed.status === 'success') {
                    log(`[WORKER] Backup job ${processed.jobId} completed successfully.`);
                }
                health.markReady();
            } catch (error) {
                health.markNotReady(error.message);
                log(`[WORKER] Backup job processing failed: ${error.message}`);
            }
        }, Number.isFinite(pollMs) && pollMs > 0 ? pollMs : 5000);
        health.markReady();
        log('[WORKER] Scheduler worker started. Cron jobs are running in worker role.');
    } catch (error) {
        health.markNotReady(error.message);
        console.error('[WORKER] Scheduler worker failed to start:', error.message);
        process.exit(1);
    }
};

const shutdown = (signal) => {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
    health.markNotReady(`Shutting down due to ${signal}`);
    health.close();
    log(`[WORKER] Scheduler worker received ${signal}. Exiting.`);
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
