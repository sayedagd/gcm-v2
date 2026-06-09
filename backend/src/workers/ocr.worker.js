/**
 * Dedicated OCR worker runtime.
 * Pulls pending OCR jobs from DB and processes them with Gemini.
 */
const path = require('path');
const dotenv = require('dotenv');
const dbModule = require('../../database');
const { log } = require('../shared/utils/logger');
const {
    claimPendingOcrJob,
    completeOcrJob,
    failOcrJob,
    notifyJobCompletion,
    extractDeliveryNoteFromImage,
} = require('../modules/ai/ocr/ocr.service');
const { createWorkerHealthServer } = require('./workerHealth');

const POLL_INTERVAL_MS = Number.parseInt(process.env.OCR_WORKER_POLL_MS || '3000', 10);
let isShuttingDown = false;
let isTickRunning = false;
const health = createWorkerHealthServer({
    workerName: 'OCR-WORKER',
    portEnvVar: 'OCR_WORKER_HEALTH_PORT',
    defaultPort: 9191,
    log,
});

const findEnv = () => path.join(__dirname, '..', '..', '.env');
dotenv.config({ path: findEnv() });

process.env.PROCESS_ROLE = process.env.PROCESS_ROLE || 'worker';

const waitForDb = dbModule.waitForDb || (async () => {});

const processOneJob = async () => {
    const job = await claimPendingOcrJob();
    if (!job) return false;

    log(`[OCR-WORKER] Processing job ${job.job_id}`);

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not configured');
        }

        const extracted = await extractDeliveryNoteFromImage({ image: job.image_data, apiKey });
        await completeOcrJob({ jobId: job.job_id, extractedData: extracted });
        await notifyJobCompletion({
            callbackUrl: job.callback_url,
            jobId: job.job_id,
            status: 'COMPLETED',
            extractedData: extracted,
            errorMessage: null,
        });
        log(`[OCR-WORKER] Job completed ${job.job_id}`);
    } catch (error) {
        const finalStatus = await failOcrJob({
            jobId: job.job_id,
            errorMessage: error.message,
            attempts: job.attempts,
        });
        await notifyJobCompletion({
            callbackUrl: job.callback_url,
            jobId: job.job_id,
            status: finalStatus,
            extractedData: null,
            errorMessage: error.message,
        });
        log(`[OCR-WORKER] Job ${finalStatus} ${job.job_id}: ${error.message}`);
    }

    return true;
};

const tick = async () => {
    if (isShuttingDown || isTickRunning) return;
    isTickRunning = true;

    try {
        await processOneJob();
    } catch (error) {
        health.markNotReady(error.message);
        log(`[OCR-WORKER] Tick error: ${error.message}`);
    } finally {
        isTickRunning = false;
    }
};

const start = async () => {
    try {
        await waitForDb();
        log(`[OCR-WORKER] Started with polling interval ${POLL_INTERVAL_MS}ms`);
        health.markReady();
        await tick();
        setInterval(tick, POLL_INTERVAL_MS);
    } catch (error) {
        health.markNotReady(error.message);
        console.error('[OCR-WORKER] Startup failed:', error.message);
        process.exit(1);
    }
};

const shutdown = (signal) => {
    isShuttingDown = true;
    health.markNotReady(`Shutting down due to ${signal}`);
    health.close();
    log(`[OCR-WORKER] Received ${signal}. Exiting.`);
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
