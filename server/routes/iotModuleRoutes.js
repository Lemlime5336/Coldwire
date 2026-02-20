const express = require('express');
const router = express.Router();
const { getModules, createModule, toggleModuleActive } = require('../controllers/iotModuleController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', protect, getModules);
router.post('/', protect, adminOnly, createModule);
router.patch('/:id/toggle', protect, adminOnly, toggleModuleActive);

module.exports = router;
