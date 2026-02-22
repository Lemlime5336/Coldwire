const HalalCertificate = require('../models/HalalCertificate');
const generateId = require('../utils/generateId');

// POST /api/halal-certificates
const uploadCertificate = async (req, res) => {
  try {
    const CertID = await generateId('CERT', 'HalalCertificate');
    const cert = await HalalCertificate.create({ ...req.body, CertID });
    res.status(201).json(cert);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/halal-certificates/supplier/:suppId
const getCertificatesBySupplier = async (req, res) => {
  try {
    const certs = await HalalCertificate.find({ CertSuppID: req.params.suppId });
    res.json(certs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/halal-certificates/expired
const checkExpiredCertificates = async (req, res) => {
  try {
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    const certs = await HalalCertificate.find({ ExpiryDate: { $lte: soon } }).populate('CertSuppID', 'SuppName SuppEmail');
    res.json(certs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { uploadCertificate, getCertificatesBySupplier, checkExpiredCertificates };