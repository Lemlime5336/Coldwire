const Product = require('../models/Product');
const Delivery = require('../models/Delivery');
const EnvironmentalSensing = require('../models/EnvironmentalSensing');

// GET /api/products/:productId  — public, no auth
const getProductByQR = async (req, res) => {
  try {
    const product = await Product.findOne({ ProductID: req.params.productId })
      .populate({
        path: 'PBatchID',
        populate: { path: 'BCertID BDelID' },
      });

    if (!product) return res.status(404).json({ message: 'Product not found.' });

    const batch = product.PBatchID;
    const delivery = batch?.BDelID;
    const certificate = batch?.BCertID;

    const supplier = certificate
      ? await certificate.CertSuppID
        ? require('../models/Supplier').findById(certificate.CertSuppID)
        : null
      : null;

    const manufacturer = delivery?.DelManuID
      ? await require('../models/Manufacturer').findById(delivery.DelManuID)
      : null;

    // Sensor summary
    let sensorSummary = null;
    if (delivery) {
      const logs = await EnvironmentalSensing.find({ EDelID: delivery._id });
      const avg = (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : null;
      const temps = logs.map((l) => l.Temperature).filter((v) => v != null);
      const hums  = logs.map((l) => l.Humidity).filter((v) => v != null);
      const gases = logs.map((l) => l.Gas).filter((v) => v != null);
      sensorSummary = {
        temperature: avg(temps),
        humidity:    avg(hums),
        gas:         avg(gases),
      };
    }

    res.json({
      product: {
        ProductID: product.ProductID,
        SerialNo:  product.SerialNo,
        QRCodeURL: product.QRCodeURL,
      },
      batch: batch ? {
        BatchID:         batch.BatchID,
        Category:        batch.Category,
        Subcategory:     batch.Subcategory,
        DateSlaughtered: batch.DateSlaughtered,
        DateReceived:    batch.DateReceived,
        ImageURL:        batch.ImageURL,
      } : null,
      delivery: delivery ? {
        DelID:     delivery.DelID,
        Status:    delivery.Status,
        CreatedAt: delivery.CreatedAt,
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

module.exports = { getProductByQR };