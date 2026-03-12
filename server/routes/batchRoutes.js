const express = require('express');
const router = express.Router();
const { createBatch, getBatchesByDelivery, generateBatchQR, uploadBatchImage } = require('../controllers/batchController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const uploadBatchImageMiddleware = require('../middleware/uploadBatchImageMiddleware');

router.post('/', protect, adminOnly, createBatch);
router.get('/:deliveryId', protect, getBatchesByDelivery);
router.post('/:batchId/qr', protect, adminOnly, generateBatchQR);
router.post('/:batchId/image', protect, adminOnly, uploadBatchImageMiddleware.single('batchImage'), uploadBatchImage);

module.exports = router;