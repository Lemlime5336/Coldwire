const express = require('express');
const router = express.Router();
const { getManufacturer, updateManufacturer } = require('../controllers/manufacturerController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/me', protect, getManufacturer);
router.patch('/me', protect, adminOnly, updateManufacturer);

module.exports = router;
