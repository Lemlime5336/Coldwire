const express = require('express');
const router = express.Router();
const { getCameraFeed, getTamperEvents } = require('../controllers/cameraController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:deliveryId', protect, getCameraFeed);
router.get('/:deliveryId/tamper', protect, getTamperEvents);

module.exports = router;
