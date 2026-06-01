/**
 * GCM Facilities Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const facilitiesController = require('./facilities.controller');

router.get('/', facilitiesController.list);
router.post('/', facilitiesController.upsert);
router.delete('/:id', facilitiesController.remove);

module.exports = router;
