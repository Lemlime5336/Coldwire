const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  DelID:      { type: String, required: true, unique: true },
  DelManuID:  { type: mongoose.Schema.Types.ObjectId, ref: 'Manufacturer', required: true },
  DelTruckID: { type: mongoose.Schema.Types.ObjectId, ref: 'Truck', required: true },
  DelUserID:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  DelRetID:   { type: mongoose.Schema.Types.ObjectId, ref: 'Retailer', required: true },
  DelIMID:    { type: mongoose.Schema.Types.ObjectId, ref: 'IoTModule', required: true },
  DelBatchID: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
  Status:     { type: String, enum: ['Not Started', 'In Progress', 'Complete'], default: 'Not Started' },
  CreatedAt:  { type: Date, default: Date.now },
});

module.exports = mongoose.model('Delivery', deliverySchema);