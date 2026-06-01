/**
 * GCM Projects Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const projectsController = require('./projects.controller');

router.get('/', projectsController.list);
router.post('/', projectsController.upsert);
router.delete('/:id', projectsController.remove);

module.exports = router;
