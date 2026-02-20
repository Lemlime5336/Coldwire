const Batch = require('../models/Batch');
const Delivery = require('../models/Delivery');

// POST /api/batches
const createBatch = async (req, res) => {
  try {
    const batch = await Batch.create(req.body);
    // Add batch ID to the delivery's DelBatchID array
    await Delivery.findOneAndUpdate(
      { DelID: batch.BDelID },
      { $addToSet: { DelBatchID: batch.BatchID } }
    );
    res.status(201).json(batch);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/batches/:deliveryId
const getBatchesByDelivery = async (req, res) => {
  try {
    const batches = await Batch.find({ BDelID: req.params.deliveryId });
    res.json(batches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createBatch, getBatchesByDelivery };
