const HalalCertificate = require('../models/HalalCertificate');
const generateId = require('../utils/generateId');

// GET /api/certificates
const getCertificates = async (req, res) => {
  try {
    const filter = {};
    if (req.query.suppId) filter.CertSuppID = req.query.suppId;
    const certs = await HalalCertificate.find(filter).populate('CertSuppID', 'SuppName');
    res.json(certs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/certificates
const uploadCertificate = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const CertID = await generateId('CERT', 'HalalCertificate');
    const cert = await HalalCertificate.create({
      ...req.body,
      CertID,
      CertURL: req.file.path,
    });
    res.status(201).json(cert);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/certificates/supplier/:suppId
const getCertificatesBySupplier = async (req, res) => {
  try {
    const certs = await HalalCertificate.find({ CertSuppID: req.params.suppId }).populate('CertSuppID', 'SuppName');
    res.json(certs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/certificates/expired
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

module.exports = { getCertificates, uploadCertificate, getCertificatesBySupplier, checkExpiredCertificates };