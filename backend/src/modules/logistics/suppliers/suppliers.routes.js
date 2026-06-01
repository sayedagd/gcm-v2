/**
 * GCM Suppliers Module Routes
 */
const express = require('express');
const router = express.Router();
const { list, upsert, remove } = require('../../../shared/controllers/crudController');

router.get('/', list('suppliers'));
router.post('/', upsert('suppliers'));
router.delete('/:id', remove('suppliers'));

module.exports = router;
