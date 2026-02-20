const mongoose = require('mongoose');

const deliveryEventSchema = new mongoose.Schema({
  DEvID:     { type: String, required: true, unique: true },
  DEvDelID:  { type: String, required: true }, // FK → Delivery
  EventType: {
    type: String,
    enum: ['awaiting pickup', 'loading', 'en route', 'unloading', 'delivered'],
    required: true,
  },
  Source:    { type: String, enum: ['rfid', 'driver', 'system'], default: 'system' },
  CreatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('DeliveryEvent', deliveryEventSchema);
