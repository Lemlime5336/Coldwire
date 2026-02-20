const EnvironmentalSensing = require('../models/EnvironmentalSensing');

// GET /api/sensors/:deliveryId — all logs for a delivery
const getEnvironmentalLogs = async (req, res) => {
  try {
    const logs = await EnvironmentalSensing.find({ EDelID: req.params.deliveryId }).sort({ Timestamp: 1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/sensors/:deliveryId/latest — most recent reading
const getLatestReading = async (req, res) => {
  try {
    const log = await EnvironmentalSensing.findOne({ EDelID: req.params.deliveryId }).sort({ Timestamp: -1 });
    if (!log) return res.status(404).json({ message: 'No sensor data found.' });
    res.json(log);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getEnvironmentalLogs, getLatestReading };
