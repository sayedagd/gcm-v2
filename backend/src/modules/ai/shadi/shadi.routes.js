/**
 * GCM Shadi Assistant Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const shadiController = require('./shadi.controller');

router.post('/chat', shadiController.chat);
router.post('/log-session', shadiController.logSession);
router.get('/sessions/:id', shadiController.getSession);

module.exports = router;
