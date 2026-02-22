const mongoose = require('mongoose');

const cameraFeedSchema = new mongoose.Schema({
  CLogID:          { type: String, required: true, unique: true },
  CDelID:          { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', required: true },
  CIMID:           { type: mongoose.Schema.Types.ObjectId, ref: 'IoTModule', required: true },
  LastCapture:     { type: Date },
  TamperDetection: { type: Boolean, default: false },
  CamFeedURL:      { type: String },
});

module.exports = mongoose.model('CameraFeed', cameraFeedSchema);