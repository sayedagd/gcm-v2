/**
 * GCM Dashboard Reporting Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');

router.get('/stats', dashboardController.getStats);
router.get('/health', dashboardController.getHealth);

module.exports = router;
