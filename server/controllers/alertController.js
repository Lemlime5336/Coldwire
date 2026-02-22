const Alert = require('../models/Alert');
const mongoose = require('mongoose');

// GET /api/alerts
const getAlerts = async (req, res) => {
  try {
    const filter = {};
    if (req.query.deliveryId) filter.ADelID = new mongoose.Types.ObjectId(req.query.deliveryId);
    const alerts = await Alert.find(filter).sort({ LastUpdate: -1 });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/alerts/:id/resolve
const resolveAlert = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { Resolved: true, LastUpdate: new Date() },
      { new: true }
    );
    if (!alert) return res.status(404).json({ message: 'Alert not found.' });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/alerts/unresolved
const getUnresolvedAlerts = async (req, res) => {
  try {
    const filter = { Resolved: false };
    if (req.query.deliveryId) filter.ADelID = new mongoose.Types.ObjectId(req.query.deliveryId);
    const alerts = await Alert.find(filter).sort({ Priority: -1, LastUpdate: -1 });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAlerts, resolveAlert, getUnresolvedAlerts };