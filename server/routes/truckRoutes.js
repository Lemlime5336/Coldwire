const express = require('express');
const router = express.Router();
const { getTrucks, createTruck, toggleTruckActive } = require('../controllers/truckController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', protect, getTrucks);
router.post('/', protect, adminOnly, createTruck);
router.patch('/:id/toggle', protect, adminOnly, toggleTruckActive);

module.exports = router;
