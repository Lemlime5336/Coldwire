const DeliveryEvent = require('../models/DeliveryEvent');
const Delivery = require('../models/Delivery');
const generateId = require('../utils/generateId');

// POST /api/delivery-events
const createEvent = async (req, res) => {
  try {
    const DEvID = await generateId('DEV', 'DeliveryEvent');
    const event = await DeliveryEvent.create({ ...req.body, DEvID });

    // Auto-update delivery status based on event type
    let status;
    if (['awaiting pickup', 'loading'].includes(event.EventType)) status = 'Not Started';
    else if (event.EventType === 'en route') status = 'In Progress';
    else if (['unloading', 'delivered'].includes(event.EventType)) status = 'Complete';

    if (status) {
      await Delivery.findByIdAndUpdate(event.DEvDelID, { Status: status });
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