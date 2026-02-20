const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  ProductID: { type: String, required: true, unique: true },
  PBatchID:  { type: String, required: true }, // FK → Batch
  SerialNo:  { type: String, required: true },
  QRCodeURL: { type: String },
});

module.exports = mongoose.model('Product', productSchema);
