const mongoose = require('mongoose');

const halalCertificateSchema = new mongoose.Schema({
  CertID:     { type: String, required: true, unique: true },
  CertSuppID: { type: String, required: true }, // FK → Supplier
  Issuer:     { type: String },
  IssueDate:  { type: Date },
  ExpiryDate: { type: Date },
  CertURL:    { type: String },
});

module.exports = mongoose.model('HalalCertificate', halalCertificateSchema);
