const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  DelID:     { type: String, required: true, unique: true },
  DelManuID: { type: String, required: true }, // FK → Manufacturer
  DelTruckID:{ type: String, required: true }, // FK → Truck
  DelUserID: { type: String, required: true }, // FK → User (driver)
  DelRetID:  { type: String, required: true }, // FK → Retailer
  DelIMID:   { type: String, required: true }, // FK → IoTModule
  DelBatchID:{ type: [String], default: [] },  // FK array → Batch
  Status:    { type: String, enum: ['Not Started', 'In Progress', 'Complete'], default: 'Not Started' },
  CreatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Delivery', deliverySchema);
