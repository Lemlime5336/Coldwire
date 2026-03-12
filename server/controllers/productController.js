const Batch = require('../models/Batch');
const Supplier = require('../models/Supplier');
const Manufacturer = require('../models/Manufacturer');
const EnvironmentalSensing = require('../models/EnvironmentalSensing');

// GET /api/products/:batchId — public, no auth (QR scan lands here)
const getBatchByQR = async (req, res) => {
  try {
    const batch = await Batch.findOne({ BatchID: req.params.batchId })
      .populate('BCertID')
      .populate({
        path: 'BDelID',
        populate: [
          { path: 'DelRetID' },
          { path: 'DelTruckID' },
        ],
      });

    if (!batch) return res.status(404).json({ message: 'Batch not found.' });

    const delivery = batch.BDelID;
    const certificate = batch.BCertID;

    const supplier = certificate?.CertSuppID
      ? await Supplier.findById(certificate.CertSuppID)
      : null;

    const manufacturer = delivery?.DelManuID
      ? await Manufacturer.findById(delivery.DelManuID)
      : null;

    let sensorSummary = null;
    if (delivery) {
      const logs = await EnvironmentalSensing.find({ EDelID: delivery._id });
      const avg = arr =>
        arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : null;
      const temps = logs.map(l => l.Temperature).filter(v => v != null);
      const hums  = logs.map(l => l.Humidity).filter(v => v != null);
      const gases = logs.map(l => l.Gas).filter(v => v != null);
      sensorSummary = {
        temperature: avg(temps),
        humidity:    avg(hums),
        gas:         avg(gases),
      };
    }

    res.json({
      batch: {
        BatchID:         batch.BatchID,
        Category:        batch.Category,
        Subcategory:     batch.Subcategory,
        DateSlaughtered: batch.DateSlaughtered,
        DateReceived:    batch.DateReceived,
        Quantity:        batch.Quantity,
        QRCodeURL:        batch.QRCodeURL,
        BatchImageURL:   batch.BatchImageURL, 
      },
      delivery: delivery ? {
        DelID:       delivery.DelID,
        Status:      delivery.Status,
        StorageType: delivery.StorageType,
        CreatedAt:   delivery.CreatedAt,
      } : null,
      certificate: certificate ? {
        CertID:     certificate.CertID,
        Issuer:     certificate.Issuer,
        IssueDate:  certificate.IssueDate,
        ExpiryDate: certificate.ExpiryDate,
        CertURL:    certificate.CertURL,
      } : null,
      supplier: supplier ? {
        SuppName:    supplier.SuppName,
        SuppAddress: supplier.SuppAddress,
      } : null,
      manufacturer: manufacturer ? {
        ManuName:    manufacturer.ManuName,
        ManuAddress: manufacturer.ManuAddress,
      } : null,
      sensorSummary,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getBatchByQR };