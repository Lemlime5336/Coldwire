const express = require('express');
const router = express.Router();
const { getCertificates, uploadCertificate, getCertificatesBySupplier, checkExpiredCertificates } = require('../controllers/halalCertificateController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadHCMiddleware');

router.get('/', protect, getCertificates);                                           // ← add
router.post('/', protect, adminOnly, upload.single('certificate'), uploadCertificate);
router.get('/expired', protect, adminOnly, checkExpiredCertificates);
router.get('/supplier/:suppId', protect, getCertificatesBySupplier);

module.exports = router;