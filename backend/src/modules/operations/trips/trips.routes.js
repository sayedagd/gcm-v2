/**
 * GCM Trips Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const tripsController = require('./trips.controller');

router.get('/', tripsController.list);
router.post('/', tripsController.upsert);
router.delete('/:id', tripsController.remove);

module.exports = router;
