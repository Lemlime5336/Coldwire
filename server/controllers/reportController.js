const Delivery = require('../models/Delivery');
const Batch = require('../models/Batch');
const DeliveryEvent = require('../models/DeliveryEvent');
const EnvironmentalSensing = require('../models/EnvironmentalSensing');
const Alert = require('../models/Alert');

// GET /api/reports/delivery/:id
const generateDeliveryReport = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('DelTruckID', 'TruckID')
      .populate('DelUserID', 'UserName')
      .populate('DelRetID', 'RetName RetAddress')
      .populate('DelIMID', 'IMID');

    if (!delivery) return res.status(404).json({ message: 'Delivery not found.' });

    const [batches, events, sensorLogs, alerts] = await Promise.all([
      Batch.find({ BDelID: delivery._id }).populate('BCertID'),
      DeliveryEvent.find({ DEvDelID: delivery._id }).sort({ CreatedAt: 1 }),
      EnvironmentalSensing.find({ EDelID: delivery._id }).sort({ Timestamp: 1 }),
      Alert.find({ ADelID: delivery._id }),
    ]);

    const temps  = sensorLogs.map((l) => l.Temperature).filter((v) => v != null);
    const hums   = sensorLogs.map((l) => l.Humidity).filter((v) => v != null);
    const gases  = sensorLogs.map((l) => l.Gas).filter((v) => v != null);

    const avg = (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : null;
    const min = (arr) => arr.length ? Math.min(...arr) : null;
    const max = (arr) => arr.length ? Math.max(...arr) : null;

    res.json({
      delivery,
      batches,
      events,
      sensorSummary: {
        temperature:   { avg: avg(temps), min: min(temps), max: max(temps) },
        humidity:      { avg: avg(hums),  min: min(hums),  max: max(hums)  },
        gas:           { avg: avg(gases), min: min(gases), max: max(gases) },
        totalReadings: sensorLogs.length,
      },
      alerts: {
        total:      alerts.length,
        unresolved: alerts.filter((a) => !a.Resolved).length,
        byType:     alerts.reduce((acc, a) => {
          acc[a.AlertType] = (acc[a.AlertType] || 0) + 1;
          return acc;
        }, {}),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { generateDeliveryReport };