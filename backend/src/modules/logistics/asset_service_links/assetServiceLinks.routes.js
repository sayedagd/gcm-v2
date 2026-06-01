/**
 * GCM Asset-Service Links Routes
 */
const router = require('express').Router();
const ctrl = require('./assetServiceLinks.controller');

router.get('/', ctrl.listAll);
router.get('/:assetType/:assetId', ctrl.getByAsset);
router.put('/:assetType/:assetId', ctrl.syncLinks);

module.exports = router;
