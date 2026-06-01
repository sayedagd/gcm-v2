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

const BACKUPS_DIR = path.join(__dirname, '..', '..', '..', 'backups');

// Ensure backups directory exists
if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

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

        const latestPath = path.join(BACKUPS_DIR, `latest_backup.${format === 'full' ? 'zip' : 'sql'}`);
        const timestampedPath = path.join(BACKUPS_DIR, `GCM_BACKUP_${timestamp}.${format === 'full' ? 'zip' : 'sql'}`);

        if (format === 'full') {
            return new Promise((resolve, reject) => {
                const output = fs.createWriteStream(latestPath);
                const archive = archiver('zip', { zlib: { level: 9 } });

                output.on('close', () => {
                    fs.copyFileSync(latestPath, timestampedPath);
                    log(`[AUTO-BACKUP] SUCCESS (FULL): Saved to ${latestPath} (${archive.pointer()} total bytes)`);
                    resolve({ status: 'success', path: latestPath });
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
            fs.writeFileSync(latestPath, contentToSave);
            fs.writeFileSync(timestampedPath, contentToSave);
            log(`[AUTO-BACKUP] SUCCESS: Saved to ${latestPath}`);
            return { status: 'success', path: latestPath };
        }
    } catch (e) {
        log(`[AUTO-BACKUP ERROR] ${e.message}`);
        throw e;
    }
};

const getBackupStatus = () => {
    try {
        if (!fs.existsSync(BACKUPS_DIR)) return { lastBackupDate: null, isMediaIncluded: false };
        
        const files = fs.readdirSync(BACKUPS_DIR)
            .filter(f => f.startsWith('GCM_BACKUP_'))
            .map(f => {
                const fullPath = path.join(BACKUPS_DIR, f);
                const stat = fs.statSync(fullPath);
                return { name: f, time: stat.mtime.getTime(), isFull: f.endsWith('.zip') };
            })
            .sort((a, b) => b.time - a.time); // newest first

        if (files.length === 0) return { lastBackupDate: null, isMediaIncluded: false };

        return {
            lastBackupDate: new Date(files[0].time).toISOString(),
            isMediaIncluded: files[0].isFull
        };
    } catch (e) {
        log(`[AUTO-BACKUP STATUS ERROR] ${e.message}`);
        return { lastBackupDate: null, isMediaIncluded: false };
    }
};

// Schedule: Weekly on Sunday @ Midnight (00:00)
const initBackupScheduler = () => {
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
    BACKUPS_DIR
};
