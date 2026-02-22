const Delivery = require('../models/Delivery');
const generateId = require('../utils/generateId');

// POST /api/deliveries
const createDelivery = async (req, res) => {
  try {
    const DelID = await generateId('DEL', 'Delivery');
    const delivery = await Delivery.create({ ...req.body, DelID, DelManuID: req.user.manuId });
    res.status(201).json(delivery);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/deliveries
const getDeliveries = async (req, res) => {
  try {
    const filter = { DelManuID: req.user.manuId };
    if (req.user.role === 'driver') filter.DelUserID = req.user.id;
    const deliveries = await Delivery.find(filter)
      .populate('DelTruckID', 'TruckID')
      .populate('DelUserID', 'UserName')
      .populate('DelRetID', 'RetName')
      .populate('DelIMID', 'IMID')
      .sort({ CreatedAt: -1 });
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/deliveries/:id
const getDeliveryById = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('DelTruckID')
      .populate('DelUserID', '-Password')
      .populate('DelRetID')
      .populate('DelIMID')
      .populate('DelBatchID');
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

    const delivery = await Delivery.findByIdAndUpdate(
      req.params.id,
      { Status: status },
      { new: true }
    );
    if (!delivery) return res.status(404).json({ message: 'Delivery not found.' });
    res.json(delivery);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createDelivery, getDeliveries, getDeliveryById, updateDeliveryStatus };