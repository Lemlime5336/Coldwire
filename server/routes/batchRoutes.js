const express = require('express');
const router = express.Router();
const { createBatch, getBatchesByDelivery } = require('../controllers/batchController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/', protect, adminOnly, createBatch);
router.get('/:deliveryId', protect, getBatchesByDelivery);

module.exports = router;
