const mongoose = require('mongoose');

const manufacturerSchema = new mongoose.Schema({
  ManuID:        { type: String, required: true, unique: true },
  ManuName:      { type: String, required: true },
  ManuAddress:   { type: String },
  ManuTelephone: { type: String },
  ManuEmail:     { type: String },
  IsActive:      { type: Boolean, default: true },
});

module.exports = mongoose.model('Manufacturer', manufacturerSchema);
