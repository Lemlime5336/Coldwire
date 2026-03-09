const mqtt = require('mqtt');
const generateId = require('../utils/generateId');
const IoTModule = require('../models/IoTModule');
const EnvironmentalSensing = require('../models/EnvironmentalSensing');
const DeliveryEvent = require('../models/DeliveryEvent');
const Delivery = require('../models/Delivery');
const Batch = require('../models/Batch');
const RFIDTag = require('../models/RFIDTag');
const Alert = require('../models/Alert');
const { getBatchByRFID } = require('../controllers/batchController');

const THRESHOLDS = {
  humidity: { min: 20, max: 90 },
  gas:      { max: 500 },
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
  client.subscribe('coldwire/+/+/camera_events');
  client.subscribe('coldwire/+/+/camera_snapshot');
  client.subscribe('coldwire/+/+/camera_status');
});

client.on('error', (err) => console.error('MQTT error:', err.message));

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
    const parts      = topic.split('/');
    const imidString = parts[2];
    const msgType    = parts[3];

    if (msgType === 'camera_snapshot') {
      const camModule = require('../camera');
      camModule.onCameraSnapshot(imidString, payload);
      return;
    }

    if (msgType === 'camera_events') {
      const camModule = require('../camera');
      let data;
      try { data = JSON.parse(payload.toString()); } catch { return; }
      camModule.onCameraEvent(imidString, data);
      return;
    }

    if (msgType === 'camera_status') {
      const camModule = require('../camera');
      let data;
      try { data = JSON.parse(payload.toString()); } catch { return; }
      camModule.onCameraStatus(imidString, data);
      return;
    }

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

      const isFrozen = delivery.StorageType === 'Frozen';
      const tempBreached = isFrozen
        ? temperature > -18
        : temperature < 0 || temperature > 4;

      if (tempBreached) {
        await raiseAlert({
          moduleObjectId, deliveryObjectId,
          type: 'temperature',
          message: isFrozen
            ? `Temperature above safe frozen range: ${temperature}°C (must be below -18°C)`
            : `Temperature out of chilled range: ${temperature}°C (safe: 0°C – 4°C)`,
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
      else if (['en route', 'unloading'].includes(eventType)) deliveryStatus = 'In Progress';
      else if (eventType === 'delivered') deliveryStatus = 'Complete';

      if (deliveryStatus) {
        await Delivery.findByIdAndUpdate(deliveryObjectId, { Status: deliveryStatus });
      }

      // Release RFID tags when delivery is complete
      if (eventType === 'delivered') {
        const batches = await Batch.find({ BDelID: deliveryObjectId });
        const rfidUIDs = batches.map(b => b.RFIDTag).filter(Boolean);
        if (rfidUIDs.length) {
          await RFIDTag.updateMany({ UID: { $in: rfidUIDs } }, { $set: { InUse: false } });
        }
      }

      if (rfid_tag) {
        const batch = await getBatchByRFID(rfid_tag);

        if (!batch) {
          await raiseAlert({
            moduleObjectId, deliveryObjectId,
            type: 'batch mismatch',
            message: `Unregistered RFID tag scanned: ${rfid_tag}`,
            priority: 'High',
          });
          console.warn(`Unregistered RFID tag scanned: ${rfid_tag}`);
        } else {
          const batchBelongsToDelivery = delivery.DelBatchID.some(
            id => id.toString() === batch._id.toString()
          );

          if (!batchBelongsToDelivery) {
            await raiseAlert({
              moduleObjectId, deliveryObjectId,
              type: 'batch mismatch',
              message: `Batch ${batch.BatchID} (tag: ${rfid_tag}) does not belong to this delivery.`,
              priority: 'High',
            });
            console.warn(`Batch ${batch.BatchID} scanned on wrong delivery.`);
          } else {
            console.log(`Batch ${batch.BatchID} confirmed on delivery.`);
          }
        }
      }
    }

  } catch (err) {
    console.error('MQTT message handling error:', err.message);
  }
});

function publishCommand(topic, command) {
  client.publish(topic, command);
  console.log(`[MQTT] CMD → ${topic}: ${command}`);
}

module.exports = { client, publishCommand };