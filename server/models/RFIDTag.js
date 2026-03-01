const mongoose = require('mongoose');

const rfidTagSchema = new mongoose.Schema({
  TagID:    { type: String, required: true, unique: true },
  UID:      { type: String, required: true, unique: true },
  IsActive: { type: Boolean, default: true },
  InUse:    { type: Boolean, default: false },
});

module.exports = mongoose.model('RFIDTag', rfidTagSchema);
