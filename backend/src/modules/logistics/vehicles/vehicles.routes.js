/**
 * GCM Vehicles Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const vehiclesController = require('./vehicles.controller');

router.get('/', vehiclesController.list);
router.post('/', vehiclesController.upsert);
router.delete('/:id', vehiclesController.remove);

module.exports = router;
