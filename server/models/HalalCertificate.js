const mongoose = require('mongoose');

const halalCertificateSchema = new mongoose.Schema({
  CertID:     { type: String, required: true, unique: true },
  CertSuppID: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  Issuer:     { type: String },
  IssueDate:  { type: Date },
  ExpiryDate: { type: Date },
  CertURL:    { type: String },
});

module.exports = mongoose.model('HalalCertificate', halalCertificateSchema);