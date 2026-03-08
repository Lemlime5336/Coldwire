const mongoose = require('mongoose');

const iotModuleSchema = new mongoose.Schema({
  IMID:     { type: String, required: true, unique: true },
  IsActive: { type: Boolean, default: true },
  CamIP:    { type: String, required: true }, 
});

module.exports = mongoose.model('IoTModule', iotModuleSchema);