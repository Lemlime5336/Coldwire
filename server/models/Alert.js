const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  AlertID:      { type: String, required: true, unique: true },
  AIMID:        { type: String, required: true }, // FK → IoTModule
  ADelID:       { type: String, required: true }, // FK → Delivery
  AlertType:    { type: String, enum: ['temperature', 'humidity', 'gas', 'no data', 'signal drop'], required: true },
  AlertMessage: { type: String },
  Priority:     { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
  Resolved:     { type: Boolean, default: false },
  CreatedAt:    { type: Date, default: Date.now },
  LastUpdate:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('Alert', alertSchema);
