/**
 * GCM Asset Requests Routes
 */
const express = require('express');
const router = express.Router();
const assetRequestsController = require('./asset_requests.controller');
const { protect } = require('../../../shared/middleware/authMiddleware');

router.get('/', protect, assetRequestsController.list);
router.post('/', protect, assetRequestsController.upsert);
router.delete('/:id', protect, assetRequestsController.remove);

module.exports = router;
