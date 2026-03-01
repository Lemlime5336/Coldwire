const mqtt = require('mqtt');
const generateId = require('../utils/generateId');
const IoTModule = require('../models/IoTModule');
const EnvironmentalSensing = require('../models/EnvironmentalSensing');
const DeliveryEvent = require('../models/DeliveryEvent');
const Delivery = require('../models/Delivery');
const Alert = require('../models/Alert');
const { getBatchByRFID } = require('../controllers/batchController');  // ← added

const THRESHOLDS = {
  temperature: { min: 0, max: 4 },
  humidity:    { min: 20, max: 90 },
  gas:         { max: 500 },
};

const client = mqtt.connect(`mqtts://${process.env.MQTT_HOST}`, {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
  port: 8883,
});

client.on('connect', () => {
  console.log('MQTT connected.');
  client.subscribe('coldwire/+/+/environmental_logs');
  client.subscribe('coldwire/+/+/batch_delivery_events');
  client.subscribe('coldwire/+/+/rfid_scan');  // ← added
});

client.on('error', (err) => console.error('MQTT error:', err.message));

// Returns { moduleObjectId, deliveryObjectId } or null
async function getActiveContext(imidString) {
  const module = await IoTModule.findOne({ IMID: imidString, IsActive: true });
  if (!module) return null;

  const delivery = await Delivery.findOne({
    DelIMID: module._id,
    Status: { $ne: 'Complete' },
  }).sort({ CreatedAt: -1 });

  if (!delivery) return null;

  return { moduleObjectId: module._id, deliveryObjectId: delivery._id, delivery };
}

async function raiseAlert({ moduleObjectId, deliveryObjectId, type, message, priority }) {
  try {
    const existing = await Alert.findOne({
      AIMID: moduleObjectId,
      ADelID: deliveryObjectId,
      AlertType: type,
      Resolved: false,
    });

    if (existing) {
      existing.LastUpdate = new Date();
      await existing.save();
      return;
    }

    const AlertID = await generateId('ALT', 'Alert');
    await Alert.create({
      AlertID,
      AIMID: moduleObjectId,
      ADelID: deliveryObjectId,
      AlertType: type,
      AlertMessage: message,
      Priority: priority,
      Resolved: false,
    });
  } catch (err) {
    console.error('Failed to create alert:', err.message);
  }
}

client.on('message', async (topic, payload) => {
  try {
    const parts = topic.split('/');
    const imidString = parts[2];
    const msgType = parts[3];
    const data = JSON.parse(payload.toString());

    const context = await getActiveContext(imidString);
    if (!context) {
      console.warn(`No active delivery for module ${imidString}. Discarding message.`);
      return;
    }

    const { moduleObjectId, deliveryObjectId, delivery } = context;

    if (msgType === 'environmental_logs') {
      const { temperature, humidity, gas, latitude, longitude, timestamp } = data;

      const ELogID = await generateId('ELOG', 'EnvironmentalSensing');
      await EnvironmentalSensing.create({
        ELogID,
        EDelID:      deliveryObjectId,
        EIMID:       moduleObjectId,
        Temperature: temperature,
        Humidity:    humidity,
        Gas:         gas,
        Latitude:    latitude,
        Longitude:   longitude,
        Timestamp:   timestamp ? new Date(timestamp) : new Date(),
      });

      if (temperature < THRESHOLDS.temperature.min || temperature > THRESHOLDS.temperature.max) {
        await raiseAlert({
          moduleObjectId, deliveryObjectId,
          type: 'temperature',
          message: `Temperature out of range: ${temperature}°C`,
          priority: 'High',
        });
      }

      if (humidity < THRESHOLDS.humidity.min || humidity > THRESHOLDS.humidity.max) {
        await raiseAlert({
          moduleObjectId, deliveryObjectId,
          type: 'humidity',
          message: `Humidity out of range: ${humidity}%`,
          priority: 'Medium',
        });
      }

      if (gas > THRESHOLDS.gas.max) {
        await raiseAlert({
          moduleObjectId, deliveryObjectId,
          type: 'gas',
          message: `Gas level elevated: ${gas} ppm`,
          priority: 'High',
        });
      }
    }

    if (msgType === 'batch_delivery_events') {
      const { rfid_tag, status, timestamp } = data;

      const eventTypeMap = {
        'awaiting pickup': 'awaiting pickup',
        'loading':         'loading',
        'en route':        'en route',
        'unloading':       'unloading',
        'delivered':       'delivered',
      };

      const eventType = eventTypeMap[status];
      if (!eventType) {
        console.warn(`Unknown event status: ${status}`);
        return;
      }

      const DEvID = await generateId('DEV', 'DeliveryEvent');
      await DeliveryEvent.create({
        DEvID,
        DEvDelID:  deliveryObjectId,
        EventType: eventType,
        Source:    rfid_tag ? 'rfid' : 'system',
        CreatedAt: timestamp ? new Date(timestamp) : new Date(),
      });

      let deliveryStatus;
      if (['awaiting pickup', 'loading'].includes(eventType)) deliveryStatus = 'Not Started';
      else if (eventType === 'en route') deliveryStatus = 'In Progress';
      else if (['unloading', 'delivered'].includes(eventType)) deliveryStatus = 'Complete';

      if (deliveryStatus) {
        await Delivery.findByIdAndUpdate(deliveryObjectId, { Status: deliveryStatus });
      }
    }

    // ← added: handle batch RFID scans
    if (msgType === 'rfid_scan') {
      const { uid, timestamp } = data;

      if (!uid) {
        console.warn('rfid_scan received with no UID, discarding.');
        return;
      }

      // Look up batch by scanned UID
      const batch = await getBatchByRFID(uid);

      if (!batch) {
        // UID not registered to any batch
        await raiseAlert({
          moduleObjectId, deliveryObjectId,
          type: 'batch mismatch',
          message: `Unregistered RFID tag scanned: ${uid}`,
          priority: 'High',
        });
        console.warn(`Unregistered RFID tag scanned: ${uid}`);
        return;
      }

      // Check the batch belongs to this delivery
      const batchBelongsToDelivery = delivery.DelBatchID.some(
        id => id.toString() === batch._id.toString()
      );

      if (!batchBelongsToDelivery) {
        // Batch exists but belongs to a different delivery
        await raiseAlert({
          moduleObjectId, deliveryObjectId,
          type: 'batch mismatch',
          message: `Batch ${batch.BatchID} (tag: ${uid}) does not belong to this delivery.`,
          priority: 'High',
        });
        console.warn(`Batch ${batch.BatchID} scanned on wrong delivery.`);
        return;
      }

      // All good — log the scan
      console.log(`Batch ${batch.BatchID} confirmed on delivery at ${timestamp || new Date().toISOString()}`);
    }

  } catch (err) {
    console.error('MQTT message handling error:', err.message);
  }
});

module.exports = client;