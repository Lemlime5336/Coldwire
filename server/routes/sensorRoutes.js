const express = require('express');
const router = express.Router();
const { getEnvironmentalLogs, getLatestReading } = require('../controllers/sensorController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:deliveryId', protect, getEnvironmentalLogs);
router.get('/:deliveryId/latest', protect, getLatestReading);

module.exports = router;
