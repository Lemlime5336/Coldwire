const HalalCertificate = require('../models/HalalCertificate');

// POST /api/certificates  (file upload handled by uploadMiddleware)
const uploadCertificate = async (req, res) => {
  try {
    // req.file is available from multer — URL would be set after Supabase upload (Step 10)
    // For now, accept CertURL directly in body or leave blank until Supabase is wired up
    const cert = await HalalCertificate.create(req.body);
    res.status(201).json(cert);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/certificates/supplier/:suppId
const getCertificatesBySupplier = async (req, res) => {
  try {
    const certs = await HalalCertificate.find({ CertSuppID: req.params.suppId });
    res.json(certs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/certificates/expired  — certs expired or expiring within 30 days
const checkExpiredCertificates = async (req, res) => {
  try {
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    const certs = await HalalCertificate.find({ ExpiryDate: { $lte: soon } });
    res.json(certs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { uploadCertificate, getCertificatesBySupplier, checkExpiredCertificates };
