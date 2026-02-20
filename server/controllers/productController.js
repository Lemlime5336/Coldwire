const Product = require('../models/Product');
const Batch = require('../models/Batch');
const Delivery = require('../models/Delivery');
const HalalCertificate = require('../models/HalalCertificate');
const Supplier = require('../models/Supplier');
const Manufacturer = require('../models/Manufacturer');
const EnvironmentalSensing = require('../models/EnvironmentalSensing');

// GET /api/products/:productId  — public, no auth
const getProductByQR = async (req, res) => {
  try {
    const product = await Product.findOne({ ProductID: req.params.productId });
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    const batch = await Batch.findOne({ BatchID: product.PBatchID });
    const delivery = batch ? await Delivery.findOne({ DelID: batch.BDelID }) : null;
    const certificate = batch?.BCertID ? await HalalCertificate.findOne({ CertID: batch.BCertID }) : null;
    const supplier = certificate ? await Supplier.findOne({ SuppID: certificate.CertSuppID }) : null;
    const manufacturer = delivery ? await Manufacturer.findOne({ ManuID: delivery.DelManuID }) : null;

    // Sensor summary
    let sensorSummary = null;
    if (delivery) {
      const logs = await EnvironmentalSensing.find({ EDelID: delivery.DelID });
      const avg = (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : null;
      const temps = logs.map((l) => l.Temperature).filter(Boolean);
      const hums  = logs.map((l) => l.Humidity).filter(Boolean);
      const gases = logs.map((l) => l.Gas).filter(Boolean);
      sensorSummary = {
        temperature: avg(temps),
        humidity: avg(hums),
        gas: avg(gases),
      };
    }

    res.json({
      product,
      batch,
      delivery: delivery ? { DelID: delivery.DelID, Status: delivery.Status, CreatedAt: delivery.CreatedAt } : null,
      certificate,
      supplier,
      manufacturer,
      sensorSummary,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getProductByQR };
