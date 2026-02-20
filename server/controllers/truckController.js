const Truck = require('../models/Truck');

const getTrucks = async (req, res) => {
  try {
    const trucks = await Truck.find({ TrManuID: req.user.manuId });
    res.json(trucks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createTruck = async (req, res) => {
  try {
    const truck = await Truck.create({ ...req.body, TrManuID: req.user.manuId });
    res.status(201).json(truck);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const toggleTruckActive = async (req, res) => {
  try {
    const truck = await Truck.findOne({ TruckID: req.params.id });
    if (!truck) return res.status(404).json({ message: 'Truck not found.' });
    truck.IsActive = !truck.IsActive;
    await truck.save();
    res.json({ IsActive: truck.IsActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getTrucks, createTruck, toggleTruckActive };
