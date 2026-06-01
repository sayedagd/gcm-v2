/**
 * GCM Companies Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const companiesController = require('./companies.controller');

router.get('/', companiesController.list);
router.post('/', companiesController.upsert);
router.delete('/:id', companiesController.remove);

module.exports = router;
