const Batch = require('../models/Batch');
const Delivery = require('../models/Delivery');
const generateId = require('../utils/generateId');

// POST /api/batches
const createBatch = async (req, res) => {
  try {
    const BatchID = await generateId('BATCH', 'Batch');
    const batch = await Batch.create({ ...req.body, BatchID });

    // Add batch _id to the delivery's DelBatchID array
    await Delivery.findByIdAndUpdate(
      batch.BDelID,
      { $addToSet: { DelBatchID: batch._id } }
    );

    res.status(201).json(batch);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/batches/:deliveryId
const getBatchesByDelivery = async (req, res) => {
  try {
    const batches = await Batch.find({ BDelID: req.params.deliveryId }).populate('BCertID');
    res.json(batches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createBatch, getBatchesByDelivery };