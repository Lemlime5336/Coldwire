const Batch = require('../models/Batch');
const Delivery = require('../models/Delivery');
const RFIDTag = require('../models/RFIDTag');
const generateId = require('../utils/generateId');

// POST /api/batches
const createBatch = async (req, res) => {
  try {
    const BatchID = await generateId('BATCH', 'Batch');
    const data = { ...req.body, BatchID };
    if (!data.BCertID) delete data.BCertID;

    // If an RFID UID was provided, validate and mark it InUse
    if (data.RFIDTag) {
      const tag = await RFIDTag.findOne({ UID: data.RFIDTag });
      if (!tag) return res.status(400).json({ message: `RFID tag ${data.RFIDTag} not found in system.` });
      if (tag.InUse) return res.status(400).json({ message: `RFID tag ${data.RFIDTag} is already assigned to another batch.` });
      await RFIDTag.findByIdAndUpdate(tag._id, { InUse: true });
    }

    const batch = await Batch.create(data);

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

// Internal use by MQTT — find a batch by its RFID tag UID
const getBatchByRFID = async (uid) => {
  return await Batch.findOne({ RFIDTag: uid }).populate('BDelID');
};

module.exports = { createBatch, getBatchesByDelivery, getBatchByRFID };