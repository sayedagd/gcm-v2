/**
 * GCM Automated Backup Service
 */
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const archiver = require('archiver');
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

                archive.pipe(output);

                // Add SQL file to zip
                archive.append(sqlContent, { name: 'database_dump.sql' });

                // Add uploads folder to zip
                const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads');
                if (fs.existsSync(uploadsDir)) {
                    archive.directory(uploadsDir, 'uploads');
                } else {
                    log(`[AUTO-BACKUP] Warning: Uploads directory not found at ${uploadsDir}`);
                }

                archive.finalize();
            });
        } else {
            // Only SQL or JSON (fallback to JSON if requested)
            const contentToSave = format === 'json' ? JSON.stringify(fullData, null, 2) : sqlContent;
            const contentBuffer = Buffer.from(contentToSave, 'utf8');
            const stored = await uploadArchiveWithMetadata({
                format,
                fileName,
                buffer: contentBuffer,
                includesMedia: false,
                localPathForFallback: latestPath
            });

            log(`[AUTO-BACKUP] SUCCESS: Stored backup ${fileName}`);
            return {
                status: 'success',
                format,
                fileName,
                storageProvider: stored.storageProvider,
                path: stored.localPath || null,
                objectKey: stored.objectKey || null,
                artifactId: stored.artifactId,
                createdAt: stored.createdAt
            };
        }
    } catch (e) {
        log(`[AUTO-BACKUP ERROR] ${e.message}`);
        throw e;
    }
};

const getBackupStatus = async () => {
    try {
        const latest = await getLatestBackupArtifact();
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
    if (process.env.ENABLE_IN_PROCESS_CRON !== 'true') {
        log('[CRON] In-process scheduler disabled. Use managed platform scheduler to call /api/v1/system/backup/trigger.');
        return;
    }

    cron.schedule('0 0 * * 0', () => {
        log("[CRON] Triggering Weekly Midnight Full Backup...");
        // Use full format to zip media
        performSystemBackup('full').catch(() => { });
    });
};

module.exports = {
    performSystemBackup,
    initBackupScheduler,
    getBackupStatus,
    getLatestBackupArtifact,
    resolveBackupDownload,
    BACKUPS_DIR
};
