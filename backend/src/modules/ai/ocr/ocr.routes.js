const express = require('express');
const router = express.Router();
const { processDeliveryNoteOCR } = require('./ocr.controller');
const { protect } = require('../../../shared/middleware/authMiddleware');

// Route for processing an OCR image (Base64)
router.post('/vision', protect, processDeliveryNoteOCR);

module.exports = router;
