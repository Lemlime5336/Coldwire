const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  BatchID:         { type: String, required: true, unique: true },
  BDelID:          { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', required: true },
  BCertID:         { type: mongoose.Schema.Types.ObjectId, ref: 'HalalCertificate' },
  Category:        { type: String },
  Subcategory:     { type: String },
  DateSlaughtered: { type: Date },
  DateReceived:    { type: Date },
  Quantity:        { type: Number },
  QRCodeURL:       { type: String },
  BatchImageURL:   { type: String },
  RFIDTag:         { type: String, unique: true, sparse: true },
});

module.exports = mongoose.model('Batch', batchSchema);