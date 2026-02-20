const express = require('express');
const router = express.Router();
const { getSuppliers, createSupplier, toggleSupplierActive } = require('../controllers/supplierController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', protect, getSuppliers);
router.post('/', protect, adminOnly, createSupplier);
router.patch('/:id/toggle', protect, adminOnly, toggleSupplierActive);

module.exports = router;
