const express = require('express');
const router = express.Router();
const { createEvent, getEventsByDelivery } = require('../controllers/deliveryEventController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createEvent);
router.get('/:deliveryId', protect, getEventsByDelivery);

module.exports = router;
