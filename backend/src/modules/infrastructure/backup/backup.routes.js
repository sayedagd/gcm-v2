/**
 * GCM System Backup Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const backupController = require('./backup.controller');

const multer = require('multer');
const os = require('os');
const upload = multer({ dest: os.tmpdir() });

router.post('/trigger', backupController.triggerBackup);
router.get('/download', backupController.downloadBackup);
router.get('/status', backupController.getStatus);
router.post('/restore', upload.single('backup_file'), backupController.restoreBackup);

module.exports = router;
