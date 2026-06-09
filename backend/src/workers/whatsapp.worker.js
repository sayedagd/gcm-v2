/**
 * Dedicated WhatsApp worker runtime.
 * Initializes WhatsApp client and delivers queued WhatsApp jobs.
 */
const path = require('path');
const dotenv = require('dotenv');
const { log } = require('../shared/utils/logger');
const {
    initWhatsApp,
    processPendingWhatsAppJob,
    ensureWhatsAppJobsTable,
} = require('../shared/services/whatsappService');
const dbModule = require('../../database');
const { createWorkerHealthServer } = require('./workerHealth');

const POLL_INTERVAL_MS = Number.parseInt(process.env.WHATSAPP_WORKER_POLL_MS || '3000', 10);
let isShuttingDown = false;
let isTickRunning = false;
const health = createWorkerHealthServer({
    workerName: 'WHATSAPP-WORKER',
    portEnvVar: 'WHATSAPP_WORKER_HEALTH_PORT',
    defaultPort: 9393,
    log,
});

const findEnv = () => path.join(__dirname, '..', '..', '.env');
dotenv.config({ path: findEnv() });

process.env.PROCESS_ROLE = process.env.PROCESS_ROLE || 'worker';

const waitForDb = dbModule.waitForDb || (async () => {});

const tick = async () => {
    if (isShuttingDown || isTickRunning) return;
    isTickRunning = true;

    try {
        await processPendingWhatsAppJob();
        health.markReady();
    } catch (error) {
        health.markNotReady(error.message);
        log(`[WHATSAPP-WORKER] Tick error: ${error.message}`);
    } finally {
        isTickRunning = false;
    }
};

const start = async () => {
    try {
        await waitForDb();
        await ensureWhatsAppJobsTable();
        initWhatsApp();
        log(`[WHATSAPP-WORKER] Started with polling interval ${POLL_INTERVAL_MS}ms`);
        health.markReady();
        await tick();
        setInterval(tick, POLL_INTERVAL_MS);
    } catch (error) {
        health.markNotReady(error.message);
        console.error('[WHATSAPP-WORKER] Startup failed:', error.message);
        process.exit(1);
    }
};

const shutdown = (signal) => {
    isShuttingDown = true;
    health.markNotReady(`Shutting down due to ${signal}`);
    health.close();
    log(`[WHATSAPP-WORKER] Received ${signal}. Exiting.`);
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
