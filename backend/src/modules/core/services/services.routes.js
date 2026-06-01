/**
 * GCM Services Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const servicesController = require('./services.controller');

router.get('/', servicesController.list);
router.post('/', servicesController.upsert);
router.delete('/:id', servicesController.remove);

module.exports = router;
