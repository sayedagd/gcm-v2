let whatsappClient = null;
let latestQrCodeData = null; // Base64 string of the QR code
let isClientReady = false;
const fs = require('fs');
const { query } = require('../../../database');
const { log } = require('../utils/logger');

let ensureJobsTablePromise = null;
const WHATSAPP_JOB_MAX_ATTEMPTS = Number.parseInt(process.env.WHATSAPP_JOB_MAX_ATTEMPTS || '5', 10);
const WHATSAPP_JOB_BACKOFF_BASE_SECONDS = Number.parseInt(process.env.WHATSAPP_JOB_BACKOFF_BASE_SECONDS || '10', 10);

const buildNextAttemptAt = (attempts) => {
    const cappedAttempts = Math.max(1, Number(attempts || 1));
    const delaySeconds = WHATSAPP_JOB_BACKOFF_BASE_SECONDS * (2 ** (cappedAttempts - 1));
    return new Date(Date.now() + (delaySeconds * 1000));
};

let Client = null;
let LocalAuth = null;
let qrcode = null;

const loadWhatsAppDependencies = () => {
    if (Client && LocalAuth && qrcode) return true;

    try {
        const wa = require('whatsapp-web.js');
        Client = wa.Client;
        LocalAuth = wa.LocalAuth;
        qrcode = require('qrcode');
        return true;
    } catch (err) {
        console.warn('[WhatsApp Service] Heavy dependencies are unavailable. Service stays disabled:', err.message);
        return false;
    }
};

const initWhatsApp = () => {
    const processRole = process.env.PROCESS_ROLE || 'api';
    const allowInProcessJobs = process.env.ENABLE_IN_PROCESS_JOBS === 'true' || processRole === 'worker';
    if (!allowInProcessJobs) {
        console.log(`[WhatsApp Service] Skipping initialization in ${processRole} role.`);
        return;
    }

    if (!loadWhatsAppDependencies()) {
        return;
    }

    const configuredChromePath = process.env.CHROME_BIN;
    const linuxChromePath = '/usr/bin/chromium';
    const resolvedExecutablePath = configuredChromePath
        || (process.platform === 'linux' && fs.existsSync(linuxChromePath) ? linuxChromePath : undefined);

    whatsappClient = new Client({
        authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
        puppeteer: {
            ...(resolvedExecutablePath ? { executablePath: resolvedExecutablePath } : {}),
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--no-zygote',
                '--disable-extensions'
            ],
        },
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        }
    });

    whatsappClient.on('qr', async (qr) => {
        console.log('[WhatsApp Service] QR Code Received. Needs Scan.');
        try {
            latestQrCodeData = await qrcode.toDataURL(qr);
        } catch (err) {
            console.error('[WhatsApp Service] QR generation error:', err);
        }
    });

    whatsappClient.on('ready', () => {
        console.log('[WhatsApp Service] Client is READY!');
        isClientReady = true;
        latestQrCodeData = null; // Clear QR code as it's no longer needed
    });

    whatsappClient.on('authenticated', () => {
        console.log('[WhatsApp Service] Authenticated successfully.');
    });

    whatsappClient.on('auth_failure', msg => {
        console.error('[WhatsApp Service] Authentication failure:', msg);
        isClientReady = false;
    });

    whatsappClient.on('disconnected', (reason) => {
        console.log('[WhatsApp Service] Client was disconnected:', reason);
        isClientReady = false;
        // Re-initialize client
        setTimeout(initWhatsApp, 5000);
    });

    whatsappClient.initialize().catch(err => {
        console.error('[WhatsApp Service] Initialization error:', err);
    });
};

const ensureWhatsAppJobsTable = async () => {
    if (!ensureJobsTablePromise) {
        ensureJobsTablePromise = (async () => {
            await query(`
                CREATE TABLE IF NOT EXISTS whatsapp_jobs (
                    id SERIAL PRIMARY KEY,
                    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
                    payload JSONB NOT NULL,
                    error_message TEXT,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    started_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    dead_lettered_at TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await query('CREATE INDEX IF NOT EXISTS idx_whatsapp_jobs_status_created_at ON whatsapp_jobs (status, created_at)');
            await query('ALTER TABLE whatsapp_jobs ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
            await query('ALTER TABLE whatsapp_jobs ADD COLUMN IF NOT EXISTS dead_lettered_at TIMESTAMP');
        })().catch((error) => {
            ensureJobsTablePromise = null;
            throw error;
        });
    }

    return ensureJobsTablePromise;
};

const getQrCode = () => {
    return {
        isReady: isClientReady,
        qrCode: latestQrCodeData
    };
};

/**
 * Formats phone number to international format (e.g., 9665XXXXXXXX)
 */
const formatPhone = (phone) => {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');
    // If Saudi number starts with 05, replace 0 with 966
    if (cleaned.startsWith('05')) {
        cleaned = '966' + cleaned.substring(1);
    }
    return cleaned;
};

/**
 * Sends a WhatsApp notification to the client.
 */
const sendTripPendingReviewWhatsApp = async (trip, clientPhone, project, company) => {
    const processRole = process.env.PROCESS_ROLE || 'api';
    const allowInProcessJobs = process.env.ENABLE_IN_PROCESS_JOBS === 'true' || processRole === 'worker';

    if (!allowInProcessJobs) {
        await ensureWhatsAppJobsTable();
        await query(
            `INSERT INTO whatsapp_jobs (status, payload)
             VALUES ('PENDING', $1::jsonb)`,
            [JSON.stringify({ trip, clientPhone, project, company })]
        );
        log('[WhatsApp Service] Message queued for worker delivery.');
        return;
    }

    if (!isClientReady || !whatsappClient) {
        console.log('[WhatsApp Service] Client not ready, skipping immediate send.');
        return;
    }

    const formattedPhone = formatPhone(clientPhone);
    if (!formattedPhone) {
        console.log('[WhatsApp Service] Invalid or missing phone number.');
        return;
    }

    const tripUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/client/dashboard?highlight=${encodeURIComponent(trip.trip_id)}`;
    
    const message = `*GCM ERP System* 🚨\n\n` +
        `Dear ${company?.company_name || 'Client'},\n` +
        `A new trip is ready for your approval.\n\n` +
        `*Trip ID:* ${trip.trip_id}\n` +
        `*Project:* ${project?.project_name || 'N/A'}\n` +
        `*Date:* ${trip.date} at ${trip.time}\n` +
        `*Quantity:* ${trip.quantity} ${trip.unit}\n\n` +
        `Please review and approve the trip using the link below:\n` +
        `${tripUrl}\n\n` +
        `_This is an automated message. Please do not reply._`;

    try {
        const chatId = `${formattedPhone}@c.us`;
        await whatsappClient.sendMessage(chatId, message);
        console.log(`[WhatsApp Service] Message sent to ${formattedPhone}`);
    } catch (error) {
        console.error('[WhatsApp Service Error]', error);
    }
};

const claimPendingWhatsAppJob = async () => {
    await ensureWhatsAppJobsTable();
    const result = await query(
        `UPDATE whatsapp_jobs
         SET status = 'PROCESSING',
             started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
             updated_at = CURRENT_TIMESTAMP,
             attempts = attempts + 1
         WHERE id = (
             SELECT id
             FROM whatsapp_jobs
             WHERE status IN ('PENDING', 'RETRY')
               AND COALESCE(next_attempt_at, created_at) <= CURRENT_TIMESTAMP
             ORDER BY created_at ASC
             FOR UPDATE SKIP LOCKED
             LIMIT 1
         )
         RETURNING id, payload, attempts`,
        []
    );

    return result.rows[0] || null;
};

const completeWhatsAppJob = async (id) => {
    await query(
        `UPDATE whatsapp_jobs
         SET status = 'COMPLETED',
             error_message = NULL,
             completed_at = CURRENT_TIMESTAMP,
             next_attempt_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id]
    );
};

const failWhatsAppJob = async (id, errorMessage, attempts) => {
    const message = String(errorMessage || 'Unknown WhatsApp failure');
    const attemptCount = Number(attempts || 1);

    if (attemptCount >= WHATSAPP_JOB_MAX_ATTEMPTS) {
        await query(
            `UPDATE whatsapp_jobs
             SET status = 'DEAD_LETTER',
                 error_message = $2,
                 completed_at = CURRENT_TIMESTAMP,
                 dead_lettered_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [id, message]
        );
        return 'DEAD_LETTER';
    }

    const nextAttemptAt = buildNextAttemptAt(attemptCount);
    await query(
        `UPDATE whatsapp_jobs
         SET status = 'RETRY',
             error_message = $2,
             next_attempt_at = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, message, nextAttemptAt.toISOString()]
    );

    return 'RETRY';
};

const processPendingWhatsAppJob = async () => {
    const job = await claimPendingWhatsAppJob();
    if (!job) return false;

    const payload = job.payload || {};

    if (!isClientReady || !whatsappClient) {
        await failWhatsAppJob(job.id, 'WhatsApp client is not ready', job.attempts);
        return true;
    }

    try {
        await sendTripPendingReviewWhatsApp(
            payload.trip,
            payload.clientPhone,
            payload.project,
            payload.company
        );
        await completeWhatsAppJob(job.id);
    } catch (error) {
        await failWhatsAppJob(job.id, error.message, job.attempts);
    }

    return true;
};

module.exports = {
    initWhatsApp,
    getQrCode,
    sendTripPendingReviewWhatsApp,
    processPendingWhatsAppJob,
    ensureWhatsAppJobsTable,
};
