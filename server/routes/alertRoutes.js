const express = require('express');
const router = express.Router();
const { getAlerts, resolveAlert, getUnresolvedAlerts } = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getAlerts);
router.get('/unresolved', protect, getUnresolvedAlerts);
router.patch('/:id/resolve', protect, resolveAlert);

module.exports = router;
