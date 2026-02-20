const express = require('express');
const router = express.Router();
const { createDelivery, getDeliveries, getDeliveryById, updateDeliveryStatus } = require('../controllers/deliveryController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', protect, getDeliveries);
router.post('/', protect, adminOnly, createDelivery);
router.get('/:id', protect, getDeliveryById);
router.patch('/:id/status', protect, updateDeliveryStatus);

module.exports = router;
