const express = require('express');
const router = express.Router();
const { processDeliveryNoteOCR, getDeliveryNoteOCRJobStatus } = require('./ocr.controller');
const { protect } = require('../../../shared/middleware/authMiddleware');

// Route for processing an OCR image (Base64)
router.post('/vision', protect, processDeliveryNoteOCR);
router.get('/vision/jobs/:jobId', protect, getDeliveryNoteOCRJobStatus);

module.exports = router;
