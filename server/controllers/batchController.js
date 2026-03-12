const Batch = require('../models/Batch');
const Delivery = require('../models/Delivery');
const RFIDTag = require('../models/RFIDTag');
const generateId = require('../utils/generateId');
const QRCode = require('qrcode');
const cloudinary = require('cloudinary').v2;

// POST /api/batches
const createBatch = async (req, res) => {
  try {
    const BatchID = await generateId('BATCH', 'Batch');
    const data = { ...req.body, BatchID };
    if (!data.BCertID) delete data.BCertID;

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

// POST /api/batches/:batchId/qr — generate one QR for the whole batch, save to QRCodeURL
// All items in a batch share the same info so one QR is sufficient.
// Re-calling this overwrites the existing QR.
const generateBatchQR = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.batchId).populate('BDelID BCertID');
    if (!batch) return res.status(404).json({ message: 'Batch not found.' });

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    const qrTargetUrl = `${frontendBase}/batch/${batch.BatchID}`;

    const qrBuffer = await QRCode.toBuffer(qrTargetUrl, {
      type: 'png',
      width: 400,
      margin: 2,
      color: { dark: '#1e3a5f', light: '#ffffff' },
    });

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'coldwire/qrcodes',
          public_id: `qr_batch_${batch.BatchID}`,
          resource_type: 'image',
          overwrite: true,
        },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(qrBuffer);
    });

    batch.QRCodeURL = uploadResult.secure_url;
    await batch.save();

    res.json({ message: `QR generated for batch ${batch.BatchID}`, QRCodeURL: batch.QRCodeURL, batch });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/batches/:batchId/image — upload one product image per batch
// Re-calling overwrites the existing image on Cloudinary.
const uploadBatchImage = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.batchId);
    if (!batch) return res.status(404).json({ message: 'Batch not found.' });

    if (!req.file) return res.status(400).json({ message: 'No image provided.' });

    batch.BatchImageURL = req.file.path;
    await batch.save();

    res.json({ message: `Image uploaded for batch ${batch.BatchID}`, BatchImageURL: batch.BatchImageURL, batch });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Internal use by MQTT — find a batch by its RFID tag UID
const getBatchByRFID = async (uid) => {
  return await Batch.findOne({ RFIDTag: uid }).populate('BDelID');
};

module.exports = { createBatch, getBatchesByDelivery, generateBatchQR, uploadBatchImage, getBatchByRFID };