const DeliveryEvent = require('../models/DeliveryEvent');
const Delivery = require('../models/Delivery');
const Batch = require('../models/Batch');
const RFIDTag = require('../models/RFIDTag');
const generateId = require('../utils/generateId');

// POST /api/delivery-events
const createEvent = async (req, res) => {
  try {
    const DEvID = await generateId('DEV', 'DeliveryEvent');
    const event = await DeliveryEvent.create({ ...req.body, DEvID });

    // Auto-update delivery status based on event type
    let status;
    if (['awaiting pickup', 'loading'].includes(event.EventType)) status = 'Not Started';
    else if (['en route', 'unloading'].includes(event.EventType)) status = 'In Progress';
    else if (event.EventType === 'delivered') status = 'Complete';

    if (status) {
      await Delivery.findByIdAndUpdate(event.DEvDelID, { Status: status });
    }

    // Release RFID tags when delivery is complete
    if (event.EventType === 'delivered') {
      const batches = await Batch.find({ BDelID: event.DEvDelID });
      const rfidUIDs = batches.map(b => b.RFIDTag).filter(Boolean);
      if (rfidUIDs.length) {
        await RFIDTag.updateMany({ UID: { $in: rfidUIDs } }, { $set: { InUse: false } });
      }
    }

    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/delivery-events/:deliveryId
const getEventsByDelivery = async (req, res) => {
  try {
    const events = await DeliveryEvent.find({ DEvDelID: req.params.deliveryId }).sort({ CreatedAt: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createEvent, getEventsByDelivery };