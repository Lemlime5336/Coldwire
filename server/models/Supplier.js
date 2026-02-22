const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  SuppID:        { type: String, required: true, unique: true },
  SuppManuID:    { type: mongoose.Schema.Types.ObjectId, ref: 'Manufacturer', required: true },
  SuppName:      { type: String, required: true },
  SuppAddress:   { type: String },
  SuppTelephone: { type: String },
  SuppEmail:     { type: String },
  IsActive:      { type: Boolean, default: true },
});

module.exports = mongoose.model('Supplier', supplierSchema);