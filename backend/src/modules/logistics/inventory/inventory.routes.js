/**
 * GCM Inventory Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const inventoryController = require('./inventory.controller');

router.get('/containers', inventoryController.listContainers);
router.post('/containers', inventoryController.upsertContainer);
router.delete('/containers/:id', inventoryController.remove('containers'));

router.get('/tanks', inventoryController.listTanks);
router.post('/tanks', inventoryController.upsertTank);
router.delete('/tanks/:id', inventoryController.remove('tanks'));

router.get('/scales', inventoryController.listScales);
router.post('/scales', inventoryController.upsertScale);
router.delete('/scales/:id', inventoryController.remove('scales'));

router.get('/sizes', inventoryController.listSizes);
router.post('/sizes', inventoryController.upsertSize);
router.delete('/sizes/:id', inventoryController.remove('inventory_sizes'));

router.get('/analytics', inventoryController.getAnalytics);

module.exports = router;
