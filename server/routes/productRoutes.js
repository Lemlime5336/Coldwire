const express = require('express');
const router = express.Router();
const { getBatchByQR } = require('../controllers/productController');

// Public — QR scan by consumer lands at /batch/:batchId in the frontend
// This endpoint serves the data for that page
router.get('/:batchId', getBatchByQR);

module.exports = router;