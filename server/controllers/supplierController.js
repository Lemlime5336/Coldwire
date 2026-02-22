const Supplier = require('../models/Supplier');
const generateId = require('../utils/generateId');

const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ SuppManuID: req.user.manuId });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createSupplier = async (req, res) => {
  try {
    const SuppID = await generateId('SUPP', 'Supplier');
    const supplier = await Supplier.create({ ...req.body, SuppID, SuppManuID: req.user.manuId });
    res.status(201).json(supplier);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const toggleSupplierActive = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found.' });
    supplier.IsActive = !supplier.IsActive;
    await supplier.save();
    res.json({ IsActive: supplier.IsActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getSuppliers, createSupplier, toggleSupplierActive };