const express = require('express');
const router = express.Router();
const { getUsers, toggleUserActive } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', protect, adminOnly, getUsers);
router.patch('/:id/toggle', protect, adminOnly, toggleUserActive);

module.exports = router;
