/**
 * GCM System Health Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const healthController = require('./health.controller');

router.get('/status', healthController.checkHealth);
router.get('/ping', healthController.ping);
router.get('/liveness', healthController.liveness);
router.get('/readiness', healthController.readiness);
router.get('/dependencies', healthController.dependencies);

module.exports = router;
