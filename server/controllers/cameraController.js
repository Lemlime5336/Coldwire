const CameraFeed = require('../models/CameraFeed');

// GET /api/camera/:deliveryId — latest camera feed for a delivery
const getCameraFeed = async (req, res) => {
  try {
    const feed = await CameraFeed.findOne({ CDelID: req.params.deliveryId }).sort({ LastCapture: -1 });
    if (!feed) return res.status(404).json({ message: 'No camera feed found.' });
    res.json(feed);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/camera/:deliveryId/tamper — all tamper events for a delivery
const getTamperEvents = async (req, res) => {
  try {
    const events = await CameraFeed.find({ CDelID: req.params.deliveryId, TamperDetection: true });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getCameraFeed, getTamperEvents };
