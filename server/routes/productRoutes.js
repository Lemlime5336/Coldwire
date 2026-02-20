const express = require('express');
const router = express.Router();
const { getProductByQR } = require('../controllers/productController');

// Public — no auth middleware
router.get('/:productId', getProductByQR);

module.exports = router;
