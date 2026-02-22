const mongoose = require('mongoose');

const environmentalSensingSchema = new mongoose.Schema({
  ELogID:      { type: String, required: true, unique: true },
  EDelID:      { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', required: true },
  EIMID:       { type: mongoose.Schema.Types.ObjectId, ref: 'IoTModule', required: true },
  Temperature: { type: Number },
  Humidity:    { type: Number },
  Gas:         { type: Number },
  Latitude:    { type: Number },
  Longitude:   { type: Number },
  Timestamp:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('EnvironmentalSensing', environmentalSensingSchema);