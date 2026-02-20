const mongoose = require('mongoose');

const truckSchema = new mongoose.Schema({
  TruckID:  { type: String, required: true, unique: true },
  TrManuID: { type: String, required: true }, // FK → Manufacturer
  IsActive: { type: Boolean, default: true },
});

module.exports = mongoose.model('Truck', truckSchema);
