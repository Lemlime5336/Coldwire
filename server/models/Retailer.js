const mongoose = require('mongoose');

const retailerSchema = new mongoose.Schema({
  RetID:        { type: String, required: true, unique: true },
  RetManuID:    { type: mongoose.Schema.Types.ObjectId, ref: 'Manufacturer', required: true },
  RetName:      { type: String, required: true },
  RetAddress:   { type: String },
  RetTelephone: { type: String },
  RetEmail:     { type: String },
  IsActive:     { type: Boolean, default: true },
});

module.exports = mongoose.model('Retailer', retailerSchema);