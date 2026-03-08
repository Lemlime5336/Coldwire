const express = require('express');
const router = express.Router();
const { createBatch, getBatchesByDelivery, generateBatchQR } = require('../controllers/batchController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/', protect, adminOnly, createBatch);
router.get('/:deliveryId', protect, getBatchesByDelivery);
router.post('/:batchId/qr', protect, adminOnly, generateBatchQR);

module.exports = router;