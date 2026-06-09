/**
 * GCM System & Diagnostics Controller
 */
const fs = require('fs');
const { log, LOG_FILE } = require('../utils/logger');
const { recordBackupFailure, getMetricsSnapshot, setQueueDepth } = require('../services/metricsService');
const { buildValidationError } = require('../utils/validationErrorContract');
const { getIdempotencyValue, setIdempotencyValue } = require('../services/redisStateService');

let query = null;
let backupService = null;
let restoreService = null;

const BACKUP_FORMATS = new Set(['sql', 'json', 'full']);
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const TRIGGER_SOURCE_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/;
const ALLOWED_RESTORE_MIME_TYPES = new Set([
    'application/sql',
    'application/json',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
]);

const getQuery = () => {
    if (query) {
        return query;
    }

    try {
        query = require('../../../database').query;
        return query;
    } catch (error) {
        return null;
    }
};

const getBackupService = () => {
    if (backupService) {
        return backupService;
    }

    try {
        backupService = require('../services/backupService');
        return backupService;
    } catch (error) {
        return null;
    }
};

const getRestoreService = () => {
    if (restoreService) {
        return restoreService;
    }

    try {
        restoreService = require('../services/restoreService');
        return restoreService;
    } catch (error) {
        return null;
    }
};

const getHealth = (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
};

const getPing = async (req, res) => {
    try {
        const dbQuery = getQuery();

        if (!dbQuery) {
            return res.json({
                status: 'ok',
                environment: process.env.VERCEL ? 'Vercel' : 'Node',
                database: 'Unavailable',
                timestamp: new Date().toISOString()
            });
        }

        const dbCheck = await dbQuery('SELECT 1');
        const userCountLog = await dbQuery('SELECT count(*) FROM users');

        res.json({
            status: 'ok',
            environment: process.env.VERCEL ? 'Vercel' : 'Node',
            database: dbCheck ? 'Connected' : 'Error',
            totalUsers: userCountLog.rows[0].count,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const getLogs = (req, res) => {
    try {
        if (!fs.existsSync(LOG_FILE)) return res.send("No log file found.");
        const content = fs.readFileSync(LOG_FILE, 'utf8');
        const lines = content.split('\n').slice(-100).join('\n');
        res.header('Content-Type', 'text/plain').send(lines);
    } catch (e) { res.status(500).send(e.message); }
};

const triggerAutoBackup = async (req, res) => {
    const triggerSource = req.headers['x-scheduler-source'] || 'manual';
    const idempotencyKey = (req.headers['x-idempotency-key'] || '').toString().trim() || null;

    if (!TRIGGER_SOURCE_PATTERN.test(String(triggerSource))) {
        return res.status(400).json(buildValidationError({
            code: 'INVALID_SCHEDULER_SOURCE',
            errorEn: 'Invalid scheduler source.',
            errorAr: 'مصدر المجدول غير صالح.',
        }));
    }

    if (idempotencyKey && !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
        return res.status(400).json(buildValidationError({
            code: 'INVALID_IDEMPOTENCY_KEY',
            errorEn: 'Invalid idempotency key.',
            errorAr: 'مفتاح منع التكرار غير صالح.',
        }));
    }

    const dbQuery = getQuery();

    if (!dbQuery) {
        return res.status(503).json({ error: 'Database unavailable' });
    }

    const backup = getBackupService();
    if (!backup) {
        return res.status(503).json({ error: 'Backup service unavailable' });
    }

    try {
        if (idempotencyKey) {
            const cacheHit = await getIdempotencyValue({
                namespace: 'backup:trigger',
                identity: idempotencyKey,
            });
            if (cacheHit) {
                return res.json({
                    ...cacheHit,
                    status: 'success',
                    idempotentReplay: true,
                    fromRedisCache: true,
                });
            }

            const prior = await dbQuery(
                `SELECT bjr.id, bjr.status, bjr.artifact_id, ba.file_name, ba.created_at
                 FROM backup_job_runs bjr
                 LEFT JOIN backup_artifacts ba ON ba.id = bjr.artifact_id
                 WHERE bjr.idempotency_key = $1
                 ORDER BY bjr.requested_at DESC
                 LIMIT 1`,
                [idempotencyKey]
            );

            if (prior.rows[0] && prior.rows[0].status === 'success') {
                await setIdempotencyValue({
                    namespace: 'backup:trigger',
                    identity: idempotencyKey,
                    value: {
                        artifactId: prior.rows[0].artifact_id,
                        fileName: prior.rows[0].file_name,
                        createdAt: prior.rows[0].created_at,
                    },
                    ttlSeconds: 600,
                });

                return res.json({
                    status: 'success',
                    idempotentReplay: true,
                    artifactId: prior.rows[0].artifact_id,
                    fileName: prior.rows[0].file_name,
                    createdAt: prior.rows[0].created_at
                });
            }

            if (prior.rows[0] && (prior.rows[0].status === 'queued' || prior.rows[0].status === 'running')) {
                return res.status(202).json({
                    status: prior.rows[0].status,
                    idempotentReplay: true,
                    jobId: prior.rows[0].id,
                    artifactId: prior.rows[0].artifact_id || null,
                });
            }
        }

        const job = await backup.enqueueBackupJob({
            triggerSource,
            idempotencyKey,
        });

        log(`[API CRON] Backup queued as job ${job.id}`);

        return res.status(202).json({
            status: 'queued',
            jobId: job.id,
            requestedAt: job.requested_at,
            triggerSource: job.trigger_source,
        });
    } catch (e) {
        recordBackupFailure({ message: e.message });
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const downloadSystemBackup = async (req, res) => {
    const { format = 'sql' } = req.query;

    if (!BACKUP_FORMATS.has(format)) {
        return res.status(400).json(buildValidationError({
            code: 'INVALID_BACKUP_FORMAT',
            errorEn: 'Invalid backup format.',
            errorAr: 'صيغة النسخة الاحتياطية غير صالحة.',
        }));
    }

    log(`[Backup] Starting System Export | Format: ${format}`);
    try {
        const backup = getBackupService();
        if (!backup) {
            return res.status(503).json({ error: 'Backup service unavailable' });
        }

        await backup.performSystemBackup(format);
        const latest = await backup.getLatestBackupArtifact();
        const downloadable = await backup.resolveBackupDownload(latest);

        if (!downloadable) {
            return res.status(404).json({ error: 'Backup artifact not found' });
        }

        if (downloadable.type === 'signed_url') {
            return res.redirect(downloadable.url);
        }

        res.setHeader('Content-Disposition', `attachment; filename=${downloadable.fileName}`);
        return res.sendFile(downloadable.path);
    } catch (e) {
        log(`[Backup Error] ${e.message}`);
        recordBackupFailure({ message: e.message });
        res.status(500).json({ error: `Backup Failed: ${e.message}` });
    }
};

const getBackupStatusHandler = async (req, res) => {
    const backup = getBackupService();
    if (!backup) {
        return res.status(503).json({ error: 'Backup service unavailable' });
    }

    const jobId = Number.parseInt(String(req.query.job_id || ''), 10);
    if (Number.isFinite(jobId) && jobId > 0) {
        const job = await backup.getBackupJobById(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Backup job not found' });
        }
        return res.json({
            jobId: job.id,
            status: job.status,
            triggerSource: job.trigger_source,
            requestedAt: job.requested_at,
            finishedAt: job.finished_at,
            artifactId: job.artifact_id,
            fileName: job.file_name,
            format: job.format,
            errorMessage: job.error_message,
        });
    }

    const status = await backup.getBackupStatus();
    return res.json(status);
};

const restoreSystemBackup = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No backup file uploaded' });
        }

        if (!ALLOWED_RESTORE_MIME_TYPES.has(req.file.mimetype)) {
            return res.status(400).json(buildValidationError({
                code: 'UNSUPPORTED_BACKUP_FILE_TYPE',
                errorEn: 'Unsupported backup file type.',
                errorAr: 'نوع ملف النسخة الاحتياطية غير مدعوم.',
            }));
        }

        const restore = getRestoreService();
        if (!restore) {
            return res.status(503).json({ error: 'Restore service unavailable' });
        }

        log(`[RESTORE API] File received: ${req.file.originalname} (${req.file.mimetype})`);
        
        const result = await restore.processRestoreUpload(req.file.path, req.file.mimetype);
        res.json(result);
    } catch (e) {
        log(`[RESTORE API ERROR] ${e.message}`);
        recordBackupFailure({ message: e.message });
        res.status(500).json({ error: 'Internal server error' });
    }
};

const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const getQueueVisibilityMetrics = async () => {
    const dbQuery = getQuery();
    if (!dbQuery) {
        return null;
    }

    const result = await dbQuery(
        `WITH queue_rows AS (
            SELECT
                'ocr'::text AS queue_name,
                COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0)::int AS queued_count,
                COALESCE(SUM(CASE WHEN status = 'RETRY' THEN 1 ELSE 0 END), 0)::int AS retry_count,
                COALESCE(SUM(CASE WHEN status = 'DEAD_LETTER' THEN 1 ELSE 0 END), 0)::int AS dead_letter_count,
                COALESCE(SUM(CASE WHEN status = 'PROCESSING' THEN 1 ELSE 0 END), 0)::int AS running_count
            FROM ocr_jobs

            UNION ALL

            SELECT
                'whatsapp'::text AS queue_name,
                COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0)::int AS queued_count,
                COALESCE(SUM(CASE WHEN status = 'RETRY' THEN 1 ELSE 0 END), 0)::int AS retry_count,
                COALESCE(SUM(CASE WHEN status = 'DEAD_LETTER' THEN 1 ELSE 0 END), 0)::int AS dead_letter_count,
                COALESCE(SUM(CASE WHEN status = 'PROCESSING' THEN 1 ELSE 0 END), 0)::int AS running_count
            FROM whatsapp_jobs

            UNION ALL

            SELECT
                'backups'::text AS queue_name,
                COALESCE(SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END), 0)::int AS queued_count,
                0::int AS retry_count,
                COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0)::int AS dead_letter_count,
                COALESCE(SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END), 0)::int AS running_count
            FROM backup_job_runs
        )
        SELECT queue_name, queued_count, retry_count, dead_letter_count, running_count
        FROM queue_rows;`
    );

    const queues = {};

    for (const row of result.rows || []) {
        const queueName = String(row.queue_name || '').toLowerCase();
        if (!queueName) {
            continue;
        }

        const queued = toNumber(row.queued_count);
        const running = toNumber(row.running_count);
        const retry = toNumber(row.retry_count);
        const deadLetter = toNumber(row.dead_letter_count);
        const depth = queued + running + retry;

        queues[queueName] = {
            depth,
            queued,
            running,
            retry,
            deadLetter,
        };

        setQueueDepth({ queueName, depth });
    }

    return {
        generatedAt: new Date().toISOString(),
        queues,
    };
};

const getMetrics = async (req, res) => {
    const snapshot = getMetricsSnapshot();

    try {
        const queueVisibility = await getQueueVisibilityMetrics();
        if (queueVisibility) {
            const queueDepths = {
                ...(snapshot.metrics?.queueDepths || {}),
            };

            for (const [queueName, metrics] of Object.entries(queueVisibility.queues || {})) {
                queueDepths[queueName] = toNumber(metrics.depth);
            }

            snapshot.metrics = {
                ...(snapshot.metrics || {}),
                queueDepths,
            };
            snapshot.queueVisibility = queueVisibility;
        }
    } catch (error) {
        log(`[Metrics] Queue visibility query failed: ${error.message}`);
    }

    return res.json(snapshot);
};

module.exports = {
    getHealth,
    getPing,
    getLogs,
    triggerAutoBackup,
    downloadSystemBackup,
    getBackupStatusHandler,
    restoreSystemBackup,
    getMetrics,
    __internal: {
        BACKUP_FORMATS,
        IDEMPOTENCY_KEY_PATTERN,
        TRIGGER_SOURCE_PATTERN,
        ALLOWED_RESTORE_MIME_TYPES,
        getQueueVisibilityMetrics,
    },
};
