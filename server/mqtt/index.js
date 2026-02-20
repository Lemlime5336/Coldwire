const mqtt = require('mqtt');
const { v4: uuidv4 } = require('uuid');

const EnvironmentalSensing = require('../models/EnvironmentalSensing');
const DeliveryEvent = require('../models/DeliveryEvent');
const Delivery = require('../models/Delivery');
const Alert = require('../models/Alert');

// Thresholds for alerts
const THRESHOLDS = {
  temperature: { min: 0, max: 4 },   // °C (cold chain)
  humidity:    { min: 20, max: 90 },  // %
  gas:         { max: 500 },          // ppm
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
});

client.on('error', (err) => console.error('MQTT error:', err.message));

// Derive active delivery ID from IoT module ID
async function getActiveDeliveryId(imid) {
  const delivery = await Delivery.findOne({ DelIMID: imid, Status: { $ne: 'Complete' } })
    .sort({ CreatedAt: -1 });
  return delivery ? delivery.DelID : null;
}

async function raiseAlert({ imid, deliveryId, type, message, priority }) {
  try {
    await Alert.create({
      AlertID: uuidv4(),
      AIMID: imid,
      ADelID: deliveryId,
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
    // topic format: coldwire/<ManuID>/<IMID>/<type>
    const imid = parts[2];
    const msgType = parts[3];
    const data = JSON.parse(payload.toString());

    const deliveryId = await getActiveDeliveryId(imid);
    if (!deliveryId) {
      console.warn(`No active delivery for module ${imid}. Discarding message.`);
      return;
    }

    if (msgType === 'environmental_logs') {
      const { temperature, humidity, gas, latitude, longitude, timestamp } = data;

      await EnvironmentalSensing.create({
        ELogID:      uuidv4(),
        EDelID:      deliveryId,
        EIMID:       imid,
        Temperature: temperature,
        Humidity:    humidity,
        Gas:         gas,
        Latitude:    latitude,
        Longitude:   longitude,
        Timestamp:   timestamp ? new Date(timestamp) : new Date(),
      });

      // Check thresholds and raise alerts if needed
      if (temperature < THRESHOLDS.temperature.min || temperature > THRESHOLDS.temperature.max) {
        await raiseAlert({
          imid, deliveryId,
          type: 'temperature',
          message: `Temperature out of range: ${temperature}°C`,
          priority: 'High',
        });
      }
      if (humidity < THRESHOLDS.humidity.min || humidity > THRESHOLDS.humidity.max) {
        await raiseAlert({
          imid, deliveryId,
          type: 'humidity',
          message: `Humidity out of range: ${humidity}%`,
          priority: 'Medium',
        });
      }
      if (gas > THRESHOLDS.gas.max) {
        await raiseAlert({
          imid, deliveryId,
          type: 'gas',
          message: `Gas level elevated: ${gas} ppm`,
          priority: 'High',
        });
      }
    }

    if (msgType === 'batch_delivery_events') {
      const { rfid_tag, batch_id, status, timestamp } = data;

      // Map incoming status to DeliveryEvent EventType enum
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

      await DeliveryEvent.create({
        DEvID:     uuidv4(),
        DEvDelID:  deliveryId,
        EventType: eventType,
        Source:    rfid_tag ? 'rfid' : 'system',
        CreatedAt: timestamp ? new Date(timestamp) : new Date(),
      });

      // Update delivery status
      let deliveryStatus;
      if (['awaiting pickup', 'loading'].includes(eventType)) deliveryStatus = 'Not Started';
      else if (eventType === 'en route') deliveryStatus = 'In Progress';
      else if (['unloading', 'delivered'].includes(eventType)) deliveryStatus = 'Complete';

      if (deliveryStatus) {
        await Delivery.findOneAndUpdate({ DelID: deliveryId }, { Status: deliveryStatus });
      }
    }
  } catch (err) {
    console.error('MQTT message handling error:', err.message);
  }
});

module.exports = client;
