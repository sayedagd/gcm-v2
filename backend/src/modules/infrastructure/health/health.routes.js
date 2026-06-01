/**
 * GCM System Health Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const healthController = require('./health.controller');

router.get('/status', healthController.checkHealth);
router.get('/ping', healthController.ping);

module.exports = router;
