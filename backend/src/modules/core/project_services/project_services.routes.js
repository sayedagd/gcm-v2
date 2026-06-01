/**
 * GCM Project Services Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const { list, upsert, remove } = require('../../../shared/controllers/crudController');

router.get('/', list('project_services'));
router.post('/', upsert('project_services'));
router.delete('/:id', remove('project_services'));

module.exports = router;
