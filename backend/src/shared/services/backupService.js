/**
 * GCM Automated Backup Service
 */
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { query } = require('../../../database');
const { log } = require('../utils/logger');
const { SCHEMA } = require('../config/constants');
const {
    isObjectStorageEnabled,
    assertObjectStorageReadyForProduction,
    uploadBuffer,
    getSignedDownloadUrl
} = require('./objectStorageService');

const BACKUPS_DIR = path.join(__dirname, '..', '..', '..', 'backups');

// Ensure backups directory exists
if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

const isProduction = process.env.NODE_ENV === 'production';

const loadArchiver = async () => {
    const mod = await import('archiver');
    return mod.default || mod;
};

const contentTypeForFormat = (format) => {
    if (format === 'json') return 'application/json';
    if (format === 'full') return 'application/zip';
    return 'application/sql';
};

const extensionForFormat = (format) => (format === 'full' ? 'zip' : format === 'json' ? 'json' : 'sql');

const persistBackupArtifact = async ({
    storageProvider,
    objectKey,
    localPath,
    fileName,
    format,
    sizeBytes,
    includesMedia
}) => {
    const insert = await query(
        `INSERT INTO backup_artifacts
            (storage_provider, object_key, local_path, file_name, format, size_bytes, includes_media)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, created_at`,
        [storageProvider, objectKey || null, localPath || null, fileName, format, sizeBytes, includesMedia]
    );

    return insert.rows[0];
};

const getLatestBackupArtifact = async () => {
    const result = await query(
        `SELECT id, storage_provider, object_key, local_path, file_name, format, size_bytes, includes_media, created_at
         FROM backup_artifacts
         ORDER BY created_at DESC
         LIMIT 1`
    );

    return result.rows[0] || null;
};

const enqueueBackupJob = async ({
    triggerSource = 'manual',
    idempotencyKey = null,
}) => {
    const insert = await query(
        `INSERT INTO backup_job_runs (idempotency_key, trigger_source, status)
         VALUES ($1, $2, 'queued')
         RETURNING id, status, trigger_source, requested_at`,
        [idempotencyKey, triggerSource]
    );

    return insert.rows[0];
};

const getBackupJobById = async (jobId) => {
    const result = await query(
        `SELECT bjr.id, bjr.idempotency_key, bjr.trigger_source, bjr.status, bjr.artifact_id,
                bjr.error_message, bjr.requested_at, bjr.finished_at,
                ba.file_name, ba.format, ba.created_at AS artifact_created_at
         FROM backup_job_runs bjr
         LEFT JOIN backup_artifacts ba ON ba.id = bjr.artifact_id
         WHERE bjr.id = $1
         LIMIT 1`,
        [jobId]
    );

    return result.rows[0] || null;
};

const claimNextBackupJob = async () => {
    const result = await query(
        `WITH candidate AS (
            SELECT id
            FROM backup_job_runs
            WHERE status = 'queued'
            ORDER BY requested_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        )
        UPDATE backup_job_runs bjr
        SET status = 'running', error_message = NULL
        FROM candidate
        WHERE bjr.id = candidate.id
        RETURNING bjr.id, bjr.idempotency_key, bjr.trigger_source, bjr.status, bjr.requested_at`
    );

    return result.rows[0] || null;
};

const markBackupJobSuccess = async ({ jobId, artifactId }) => {
    await query(
        `UPDATE backup_job_runs
         SET status = 'success', artifact_id = $2, error_message = NULL, finished_at = NOW()
         WHERE id = $1`,
        [jobId, artifactId || null]
    );
};

const markBackupJobFailed = async ({ jobId, message }) => {
    await query(
        `UPDATE backup_job_runs
         SET status = 'failed', error_message = $2, finished_at = NOW()
         WHERE id = $1`,
        [jobId, (message || '').slice(0, 2000)]
    );
};

const formatForTriggerSource = (triggerSource = '') => {
    if (String(triggerSource).startsWith('cron')) {
        return 'full';
    }
    return 'sql';
};

const processPendingBackupJobs = async () => {
    const job = await claimNextBackupJob();
    if (!job) return null;

    try {
        const format = formatForTriggerSource(job.trigger_source);
        const result = await performSystemBackup(format);
        await markBackupJobSuccess({ jobId: job.id, artifactId: result.artifactId || null });
        return { jobId: job.id, status: 'success', artifactId: result.artifactId || null, result };
    } catch (error) {
        await markBackupJobFailed({ jobId: job.id, message: error.message });
        throw error;
    }
};

const uploadArchiveWithMetadata = async ({ format, fileName, buffer, includesMedia, localPathForFallback }) => {
    const useObjectStorage = isObjectStorageEnabled();

    if (isProduction) {
        assertObjectStorageReadyForProduction();
    }

    if (useObjectStorage) {
        const objectKey = `backups/${fileName}`;
        await uploadBuffer({ key: objectKey, body: buffer, contentType: contentTypeForFormat(format) });

        const artifact = await persistBackupArtifact({
            storageProvider: 's3',
            objectKey,
            localPath: null,
            fileName,
            format,
            sizeBytes: buffer.length,
            includesMedia
        });

        return {
            storageProvider: 's3',
            objectKey,
            fileName,
            artifactId: artifact.id,
            createdAt: artifact.created_at
        };
    }

    const targetPath = path.join(BACKUPS_DIR, fileName);
    fs.writeFileSync(targetPath, buffer);

    // Keep latest backup alias for local/dev workflows.
    if (localPathForFallback) {
        fs.writeFileSync(localPathForFallback, buffer);
    }

    const artifact = await persistBackupArtifact({
        storageProvider: 'local',
        objectKey: null,
        localPath: targetPath,
        fileName,
        format,
        sizeBytes: buffer.length,
        includesMedia
    });

    return {
        storageProvider: 'local',
        localPath: targetPath,
        fileName,
        artifactId: artifact.id,
        createdAt: artifact.created_at
    };
};

const performSystemBackup = async (format = 'sql') => {
    log(`[AUTO-BACKUP] Starting Backup Cycle | Format: ${format}`);
    try {
        const tablesToExport = Object.keys(SCHEMA);
        const fullData = {};
        for (const table of tablesToExport) {
            const r = await query(`SELECT * FROM ${table} ORDER BY 1`);
            fullData[table] = r.rows;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        let sqlContent = '';

        sqlContent = `-- GCM SYSTEM BACKUP\n-- Generated: ${new Date().toISOString()}\n\n`;
        sqlContent += `SET statement_timeout = 0;\nSET lock_timeout = 0;\nSET client_encoding = 'UTF8';\n\n`;
        for (const table of tablesToExport) {
            const rows = fullData[table];
            if (rows.length === 0) continue;
            const cols = Object.keys(rows[0]);
            sqlContent += `\n-- Table: ${table}\nDELETE FROM ${table};\n`;
            for (const row of rows) {
                const values = cols.map(c => {
                    const v = row[c];
                    if (v === null) return 'NULL';
                    if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
                    if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
                    return v;
                });
                sqlContent += `INSERT INTO ${table} ("${cols.join('", "')}") VALUES (${values.join(', ')});\n`;
            }
        }

        const extension = extensionForFormat(format);
        const latestPath = path.join(BACKUPS_DIR, `latest_backup.${extension}`);
        const fileName = `GCM_BACKUP_${timestamp}.${extension}`;

        if (format === 'full') {
            return new Promise((resolve, reject) => {
                const tempZipPath = path.join(BACKUPS_DIR, `tmp_${fileName}`);
                const output = fs.createWriteStream(tempZipPath);

                loadArchiver()
                    .then((archiver) => {
                        const archive = archiver('zip', { zlib: { level: 9 } });

                        output.on('close', async () => {
                            try {
                                const content = fs.readFileSync(tempZipPath);
                                const stored = await uploadArchiveWithMetadata({
                                    format,
                                    fileName,
                                    buffer: content,
                            includesMedia: true,
                            localPathForFallback: latestPath
                        });

                        if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
                        log(`[AUTO-BACKUP] SUCCESS (FULL): Stored backup ${fileName} (${archive.pointer()} total bytes)`);
                        resolve({
                            status: 'success',
                            format,
                            fileName,
                            storageProvider: stored.storageProvider,
                            path: stored.localPath || null,
                            objectKey: stored.objectKey || null,
                            artifactId: stored.artifactId,
                            createdAt: stored.createdAt
                        });
                    } catch (storageErr) {
                        reject(storageErr);
                    }
                });

                archive.on('error', (err) => {
                    log(`[AUTO-BACKUP ERROR (FULL)] ${err.message}`);
                    reject(err);
                });

                                resolve({
                                    archivePath: tempZipPath,
                                    artifactId: stored.artifactId,
                                    fileName,
                                    format
                                });
                            } catch (error) {
                                reject(error);
                            } finally {
                                try { fs.unlinkSync(tempZipPath); } catch (_) {}
                            }
                        });

                        archive.on('error', reject);
                        archive.pipe(output);

                        for (const table of tablesToExport) {
                            const rows = fullData[table];
                            const data = JSON.stringify(rows, null, 2);
                            archive.append(data, { name: `${table}.json` });
                        }

                        archive.append(sqlContent, { name: `${fileName.replace(/\.zip$/, '')}.sql` });
                        archive.finalize();
                    })
                    .catch(reject);

                output.on('error', reject);
            });
        }

        const stored = await uploadArchiveWithMetadata({
            format,
            fileName,
            buffer: Buffer.from(sqlContent, 'utf8'),
            includesMedia: false,
            localPathForFallback: latestPath
        });

        return {
            archivePath: latestPath,
            artifactId: stored.artifactId,
            fileName,
            format
        };
        if (!latest) return { lastBackupDate: null, isMediaIncluded: false };
        return {
            lastBackupDate: new Date(latest.created_at).toISOString(),
            isMediaIncluded: !!latest.includes_media,
            storageProvider: latest.storage_provider,
            lastBackupFileName: latest.file_name,
            lastBackupFormat: latest.format
        };
    } catch (e) {
        log(`[AUTO-BACKUP STATUS ERROR] ${e.message}`);
        return { lastBackupDate: null, isMediaIncluded: false };
    }
};

const resolveBackupDownload = async (artifact) => {
    if (!artifact) return null;

    if (artifact.storage_provider === 's3') {
        const signedUrl = await getSignedDownloadUrl({
            key: artifact.object_key,
            fileName: artifact.file_name,
            expiresInSeconds: 300
        });
        return { type: 'signed_url', url: signedUrl };
    }

    if (artifact.local_path && fs.existsSync(artifact.local_path)) {
        return { type: 'file', path: artifact.local_path, fileName: artifact.file_name };
    }

    return null;
};

// Schedule: Weekly on Sunday @ Midnight (00:00)
const initBackupScheduler = () => {
    const processRole = process.env.PROCESS_ROLE || 'api';
    const allowInProcessJobs = process.env.ENABLE_IN_PROCESS_JOBS === 'true' || processRole === 'worker';

    if (!allowInProcessJobs) {
        log(`[CRON] Skipping scheduler in ${processRole} role. Use worker role or ENABLE_IN_PROCESS_JOBS=true for local override.`);
        return;
    }

    if (process.env.ENABLE_IN_PROCESS_CRON !== 'true') {
        log('[CRON] In-process scheduler disabled. Use managed platform scheduler to call /api/v1/system/backup/trigger.');
        return;
    }

    cron.schedule('0 0 * * 0', () => {
        log("[CRON] Triggering Weekly Midnight Full Backup...");
        enqueueBackupJob({ triggerSource: 'cron.weekly' }).catch(() => { });
    });
};

module.exports = {
    performSystemBackup,
    enqueueBackupJob,
    getBackupJobById,
    processPendingBackupJobs,
    initBackupScheduler,
    getBackupStatus,
    getLatestBackupArtifact,
    resolveBackupDownload,
    BACKUPS_DIR
};
