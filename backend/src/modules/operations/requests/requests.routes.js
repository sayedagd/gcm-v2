/**
 * GCM Service Requests Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const requestsController = require('./requests.controller');

router.get('/', requestsController.list);
router.post('/', requestsController.upsert);
router.delete('/:id', requestsController.remove);

module.exports = router;
