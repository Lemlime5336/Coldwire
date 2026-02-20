const express = require('express');
const router = express.Router();
const { register, login, logout } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/register', protect, adminOnly, register);
router.post('/login', login);
router.post('/logout', protect, logout);

module.exports = router;
