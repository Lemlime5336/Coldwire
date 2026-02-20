const express = require('express');
const router = express.Router();
const { getRetailers, createRetailer, toggleRetailerActive } = require('../controllers/retailerController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', protect, getRetailers);
router.post('/', protect, adminOnly, createRetailer);
router.patch('/:id/toggle', protect, adminOnly, toggleRetailerActive);

module.exports = router;
