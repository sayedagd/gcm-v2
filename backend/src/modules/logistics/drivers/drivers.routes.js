/**
 * GCM Drivers Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const driversController = require('./drivers.controller');

router.get('/', driversController.list);
router.post('/', driversController.upsert);
router.delete('/:id', driversController.remove);

module.exports = router;
