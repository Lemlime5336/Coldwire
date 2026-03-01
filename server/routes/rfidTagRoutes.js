const express = require('express');
const router = express.Router();
const { getTags, createTag, toggleTagActive } = require('../controllers/rfidTagController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/',          protect, adminOnly, getTags);
router.post('/',         protect, adminOnly, createTag);
router.patch('/:id/toggle', protect, adminOnly, toggleTagActive);

module.exports = router;