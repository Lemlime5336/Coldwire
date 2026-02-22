const Manufacturer = require('../models/Manufacturer');

// GET /api/manufacturers/me
const getManufacturer = async (req, res) => {
  try {
    const manu = await Manufacturer.findById(req.user.manuId);
    if (!manu) return res.status(404).json({ message: 'Manufacturer not found.' });
    res.json(manu);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/manufacturers/me
const updateManufacturer = async (req, res) => {
  try {
    const manu = await Manufacturer.findByIdAndUpdate(
      req.user.manuId,
      req.body,
      { new: true }
    );
    if (!manu) return res.status(404).json({ message: 'Manufacturer not found.' });
    res.json(manu);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getManufacturer, updateManufacturer };