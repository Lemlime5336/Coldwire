const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  AlertID:      { type: String, required: true, unique: true },
  AIMID:        { type: mongoose.Schema.Types.ObjectId, ref: 'IoTModule', required: true },
  ADelID:       { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', required: true },
  AlertType:    { type: String, enum: ['temperature', 'humidity', 'gas', 'no data', 'signal drop', 'batch mismatch'], required: true },  // ← added 'batch mismatch'
  AlertMessage: { type: String },
  Priority:     { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
  Resolved:     { type: Boolean, default: false },
  CreatedAt:    { type: Date, default: Date.now },
  LastUpdate:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('Alert', alertSchema);