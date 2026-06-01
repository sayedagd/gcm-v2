/**
 * GCM Exports Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const exportsController = require('./exports.controller');

router.get('/backup', exportsController.exportBackup);

module.exports = router;
