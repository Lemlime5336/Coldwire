const mongoose = require('mongoose');

const environmentalSensingSchema = new mongoose.Schema({
  ELogID:      { type: String, required: true, unique: true },
  EDelID:      { type: String, required: true }, // FK → Delivery
  EIMID:       { type: String, required: true }, // FK → IoTModule
  Temperature: { type: Number },
  Humidity:    { type: Number },
  Gas:         { type: Number }, // ppm
  Latitude:    { type: Number },
  Longitude:   { type: Number },
  Timestamp:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('EnvironmentalSensing', environmentalSensingSchema);
