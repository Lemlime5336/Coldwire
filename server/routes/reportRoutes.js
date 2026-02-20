const express = require('express');
const router = express.Router();
const { generateDeliveryReport } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.get('/delivery/:deliveryId', protect, generateDeliveryReport);

module.exports = router;
