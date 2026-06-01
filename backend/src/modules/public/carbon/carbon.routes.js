/**
 * GCM Carbon API Proxy Routes
 */
const express = require('express');
const router = express.Router();
const controller = require('./carbon.proxy');

router.get(['/', ''], controller.getCarbonStats);

module.exports = router;
