/**
 * GCM Project Supplier Rates Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const { list, upsert, remove } = require('../../../shared/controllers/crudController');

router.get('/', list('project_supplier_rates'));
router.post('/', upsert('project_supplier_rates'));
router.delete('/:id', remove('project_supplier_rates'));

module.exports = router;
