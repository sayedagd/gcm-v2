/**
 * GCM Users Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const usersController = require('./users.controller');

router.get('/', usersController.list);
router.post('/', usersController.upsert);
router.delete('/:id', usersController.deleteUser);

module.exports = router;
