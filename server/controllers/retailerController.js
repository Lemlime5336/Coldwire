const Retailer = require('../models/Retailer');

const getRetailers = async (req, res) => {
  try {
    const retailers = await Retailer.find({ RetManuID: req.user.manuId });
    res.json(retailers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createRetailer = async (req, res) => {
  try {
    const retailer = await Retailer.create({ ...req.body, RetManuID: req.user.manuId });
    res.status(201).json(retailer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const toggleRetailerActive = async (req, res) => {
  try {
    const retailer = await Retailer.findOne({ RetID: req.params.id });
    if (!retailer) return res.status(404).json({ message: 'Retailer not found.' });
    retailer.IsActive = !retailer.IsActive;
    await retailer.save();
    res.json({ IsActive: retailer.IsActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getRetailers, createRetailer, toggleRetailerActive };
