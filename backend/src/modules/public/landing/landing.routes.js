/**
 * GCM Landing CMS Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const landingController = require('./landing.controller');

router.get('/', landingController.getLanding);
router.post('/', landingController.updateLanding);

module.exports = router;
