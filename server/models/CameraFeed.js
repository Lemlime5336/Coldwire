const mongoose = require('mongoose');

const cameraFeedSchema = new mongoose.Schema({
  CLogID:          { type: String, required: true, unique: true },
  CDelID:          { type: String, required: true }, // FK → Delivery
  CIMID:           { type: String, required: true }, // FK → IoTModule
  LastCapture:     { type: Date },
  TamperDetection: { type: Boolean, default: false },
  CamFeedURL:      { type: String },
});

module.exports = mongoose.model('CameraFeed', cameraFeedSchema);
