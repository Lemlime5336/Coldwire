const express = require('express');
const router  = express.Router();
const {
  getCameraFeed,
  getTamperEvents,
  sendCommand,
  getRecordings,
  deleteRecording,
  updateCamIP,
} = require('../controllers/cameraController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Existing
router.get('/:deliveryId',        protect, getCameraFeed);
router.get('/:deliveryId/tamper', protect, getTamperEvents);

// New — camera control
router.post('/command',                    protect, adminOnly, sendCommand);
router.get('/:imid/recordings',            protect, getRecordings);
router.delete('/recording/*publicId',      protect, adminOnly, deleteRecording);
router.patch('/:imid/ip',                  protect, adminOnly, updateCamIP);

module.exports = router;