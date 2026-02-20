const Delivery = require('../models/Delivery');

// POST /api/deliveries
const createDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.create({ ...req.body, DelManuID: req.user.manuId });
    res.status(201).json(delivery);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/deliveries
const getDeliveries = async (req, res) => {
  try {
    const filter = { DelManuID: req.user.manuId };
    // Drivers see only their own deliveries
    if (req.user.role === 'driver') filter.DelUserID = req.user.id;
    const deliveries = await Delivery.find(filter).sort({ CreatedAt: -1 });
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/deliveries/:id
const getDeliveryById = async (req, res) => {
  try {
    const delivery = await Delivery.findOne({ DelID: req.params.id });
    if (!delivery) return res.status(404).json({ message: 'Delivery not found.' });
    res.json(delivery);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/deliveries/:id/status
const updateDeliveryStatus = async (req, res) => {
  try {
    const { eventType } = req.body;
    let status;
    if (['awaiting pickup', 'loading'].includes(eventType)) status = 'Not Started';
    else if (eventType === 'en route') status = 'In Progress';
    else if (['unloading', 'delivered'].includes(eventType)) status = 'Complete';
    else return res.status(400).json({ message: 'Invalid event type.' });

    const delivery = await Delivery.findOneAndUpdate(
      { DelID: req.params.id },
      { Status: status },
      { new: true }
    );
    res.json(delivery);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createDelivery, getDeliveries, getDeliveryById, updateDeliveryStatus };
