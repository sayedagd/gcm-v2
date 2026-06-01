/**
 * GCM E-Commerce Store Routes
 */
const express = require('express');
const router = express.Router();
const storeController = require('./store.controller');

// ======== Public Routes ========
// Equipments catalog
router.get('/equipments', storeController.listEquipments);
router.get('/equipments/:id', storeController.getEquipment);

// Submit an inquiry for an equipment
router.post('/inquiries', storeController.submitInquiry);


// ======== Admin Routes (Ideally protected by auth middleware in production) ========
// Currently falling back to standard CRUD assuming standard GCM RBAC on frontend
router.post('/equipments', storeController.upsertEquipment);
router.put('/equipments/:id', storeController.upsertEquipment);
router.post('/equipments/:id/share', storeController.incrementShareCount);
router.delete('/equipments/:id', storeController.removeEquipment);

router.get('/inquiries', storeController.listInquiries);
router.get('/inquiries/:id', storeController.getInquiry);
router.put('/inquiries/:id', storeController.submitInquiry); // Used for admin_reply
router.delete('/inquiries/:id', storeController.removeInquiry);

module.exports = router;
