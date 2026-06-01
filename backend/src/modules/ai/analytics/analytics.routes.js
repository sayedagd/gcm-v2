/**
 * GCM AI Analytics Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const analyticsController = require('./analytics.controller');

router.get('/analytics', analyticsController.getAnalytics);
router.get('/sessions', analyticsController.listSessions);
router.patch('/sessions/:id/rate', analyticsController.rateSession);

module.exports = router;
