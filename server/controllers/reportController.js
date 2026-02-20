const Delivery = require('../models/Delivery');
const Batch = require('../models/Batch');
const DeliveryEvent = require('../models/DeliveryEvent');
const EnvironmentalSensing = require('../models/EnvironmentalSensing');
const Alert = require('../models/Alert');

// GET /api/reports/delivery/:deliveryId
const generateDeliveryReport = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    const [delivery, batches, events, sensorLogs, alerts] = await Promise.all([
      Delivery.findOne({ DelID: deliveryId }),
      Batch.find({ BDelID: deliveryId }),
      DeliveryEvent.find({ DEvDelID: deliveryId }).sort({ CreatedAt: 1 }),
      EnvironmentalSensing.find({ EDelID: deliveryId }).sort({ Timestamp: 1 }),
      Alert.find({ ADelID: deliveryId }),
    ]);

    if (!delivery) return res.status(404).json({ message: 'Delivery not found.' });

    // Summarise sensor data
    const temps = sensorLogs.map((l) => l.Temperature).filter(Boolean);
    const hums = sensorLogs.map((l) => l.Humidity).filter(Boolean);
    const gases = sensorLogs.map((l) => l.Gas).filter(Boolean);
    const avg = (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : null;
    const min = (arr) => arr.length ? Math.min(...arr) : null;
    const max = (arr) => arr.length ? Math.max(...arr) : null;

    res.json({
      delivery,
      batches,
      events,
      sensorSummary: {
        temperature: { avg: avg(temps), min: min(temps), max: max(temps) },
        humidity:    { avg: avg(hums),  min: min(hums),  max: max(hums)  },
        gas:         { avg: avg(gases), min: min(gases), max: max(gases) },
        totalReadings: sensorLogs.length,
      },
      alerts: {
        total: alerts.length,
        unresolved: alerts.filter((a) => !a.Resolved).length,
        byType: alerts.reduce((acc, a) => {
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
