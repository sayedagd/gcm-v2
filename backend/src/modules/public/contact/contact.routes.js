/**
 * GCM Contact Submissions Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const contactController = require('./contact.controller');

router.get('/', contactController.list);
router.post('/', contactController.submit);
router.delete('/:id', contactController.remove);

module.exports = router;
