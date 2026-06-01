/**
 * GCM Profile Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const profileController = require('./profile.controller');

router.get('/', profileController.getProfile);
router.patch('/', profileController.updateProfile);

module.exports = router;
