/**
 * GCM System & Diagnostics Controller
 */
const fs = require('fs');
const path = require('path');
const { query } = require('../../../database');
const { log, LOG_FILE } = require('../utils/logger');
const { performSystemBackup, getBackupStatus } = require('../services/backupService');
const { processRestoreUpload } = require('../services/restoreService');

const getHealth = (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
};

const getPing = async (req, res) => {
    try {
        const dbCheck = await query('SELECT 1');
        const userCountLog = await query('SELECT count(*) FROM users');
        const masterUser = await query("SELECT * FROM users WHERE email = 'eng-yusuf@gcm-gulf.com'");

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
    try {
        log(`[API CRON] External Backup Trigger Received`);
        const result = await performSystemBackup('sql');
        res.json({ ...result, triggered_at: new Date().toISOString() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const downloadSystemBackup = async (req, res) => {
    const { format = 'sql' } = req.query;
    log(`[Backup] Starting System Export | Format: ${format}`);
    try {
        const result = await performSystemBackup(format);
        const filename = path.basename(result.path);

        res.setHeader('Content-Type', format === 'json' ? 'application/json' : format === 'full' ? 'application/zip' : 'application/sql');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.sendFile(result.path);
    } catch (e) {
        log(`[Backup Error] ${e.message}`);
        res.status(500).json({ error: `Backup Failed: ${e.message}` });
    }
};

const getBackupStatusHandler = (req, res) => {
    const status = getBackupStatus();
    res.json(status);
};

const restoreSystemBackup = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No backup file uploaded' });
        }
        log(`[RESTORE API] File received: ${req.file.originalname} (${req.file.mimetype})`);
        
        const result = await processRestoreUpload(req.file.path, req.file.mimetype);
        res.json(result);
    } catch (e) {
        log(`[RESTORE API ERROR] ${e.message}`);
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    getHealth,
    getPing,
    getLogs,
    triggerAutoBackup,
    downloadSystemBackup,
    getBackupStatusHandler,
    restoreSystemBackup
};
