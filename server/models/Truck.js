const mongoose = require('mongoose');

const truckSchema = new mongoose.Schema({
  TruckID:  { type: String, required: true, unique: true },
  TrManuID: { type: mongoose.Schema.Types.ObjectId, ref: 'Manufacturer', required: true },
  IsActive: { type: Boolean, default: true },
});

module.exports = mongoose.model('Truck', truckSchema);