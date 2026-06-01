/**
 * GCM Notifications Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const notificationsController = require('./notifications.controller');

router.get('/', notificationsController.list);
router.post('/', notificationsController.upsert);
// IMPORTANT: specific static route must come BEFORE parameterized route
router.patch('/read-all', notificationsController.markAllAsRead);
router.patch('/:id/read', notificationsController.markAsRead);
router.delete('/', notificationsController.deleteAll);
router.delete('/:id', notificationsController.deleteById);

module.exports = router;
