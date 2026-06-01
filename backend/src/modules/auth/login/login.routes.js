/**
 * GCM Login Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const loginController = require('./login.controller');

router.post('/login', loginController.login);

module.exports = router;
