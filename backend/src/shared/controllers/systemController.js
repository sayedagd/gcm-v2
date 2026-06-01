/**
 * GCM System & Diagnostics Controller
 */
const fs = require('fs');
const { log, LOG_FILE } = require('../utils/logger');
const { recordBackupFailure, getMetricsSnapshot } = require('../services/metricsService');

let query = null;
let backupService = null;
let restoreService = null;

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
        const masterUser = await dbQuery("SELECT * FROM users WHERE email = 'eng-yusuf@gcm-gulf.com'");

        let passMatch = false;
        let hashInfo = 'User not found';
        if (masterUser.rows[0]) {
            passMatch = (masterUser.rows[0].password === '123');
            hashInfo = {
                id: masterUser.rows[0].id,
                passStored: masterUser.rows[0].password,
                role: masterUser.rows[0].role
            };
        }

        res.json({
            status: 'ok',
            environment: process.env.VERCEL ? 'Vercel' : 'Node',
            database: dbCheck ? 'Connected' : 'Error',
            totalUsers: userCountLog.rows[0].count,
            masterAccount: {
                email: 'eng-yusuf@gcm-gulf.com',
                exists: !!masterUser.rows[0],
                password_123_match: passMatch,
                debug: hashInfo
            },
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
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
    const lockKey = 98420311;
    const triggerSource = req.headers['x-scheduler-source'] || 'manual';
    const idempotencyKey = (req.headers['x-idempotency-key'] || '').toString().trim() || null;
    const dbQuery = getQuery();

    if (!dbQuery) {
        return res.status(503).json({ error: 'Database unavailable' });
    }

    const backup = getBackupService();
    if (!backup) {
        return res.status(503).json({ error: 'Backup service unavailable' });
    }

    const createRun = async ({ status, artifactId = null, errorMessage = null }) => {
        await dbQuery(
            `INSERT INTO backup_job_runs (idempotency_key, trigger_source, status, artifact_id, error_message, finished_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [idempotencyKey, triggerSource, status, artifactId, errorMessage]
        );
    };

    try {
        if (idempotencyKey) {
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
                return res.json({
                    status: 'success',
                    idempotentReplay: true,
                    artifactId: prior.rows[0].artifact_id,
                    fileName: prior.rows[0].file_name,
                    createdAt: prior.rows[0].created_at
                });
            }
        }

        const lock = await dbQuery('SELECT pg_try_advisory_lock($1) AS acquired', [lockKey]);
        if (!lock.rows[0]?.acquired) {
            return res.status(409).json({ error: 'Backup job already running' });
        }

        log(`[API CRON] External Backup Trigger Received`);
        const result = await backup.performSystemBackup('sql');
        await createRun({ status: 'success', artifactId: result.artifactId || null });

        return res.json({ ...result, triggered_at: new Date().toISOString() });
    } catch (e) {
        try {
            await createRun({ status: 'failed', errorMessage: e.message });
        } catch (_) {
            // no-op
        }
        recordBackupFailure({ message: e.message });
        return res.status(500).json({ error: e.message });
    } finally {
        try {
            await dbQuery('SELECT pg_advisory_unlock($1)', [lockKey]);
        } catch (_) {
            // no-op
        }
    }
};

const downloadSystemBackup = async (req, res) => {
    const { format = 'sql' } = req.query;
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

    const status = await backup.getBackupStatus();
    return res.json(status);
};

const restoreSystemBackup = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No backup file uploaded' });
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
        res.status(500).json({ error: e.message });
    }
};

const getMetrics = (req, res) => {
    return res.json(getMetricsSnapshot());
};

module.exports = {
    getHealth,
    getPing,
    getLogs,
    triggerAutoBackup,
    downloadSystemBackup,
    getBackupStatusHandler,
    restoreSystemBackup,
    getMetrics
};
