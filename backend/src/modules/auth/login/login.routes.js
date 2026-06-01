/**
 * GCM Login Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const loginController = require('./login.controller');

router.post('/', loginController.login);
router.post('/login', loginController.login);
router.post('/signout', loginController.logout);
router.post('/logout', loginController.logout);

module.exports = router;
