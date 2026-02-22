const mongoose = require('mongoose');

const driverAssignmentSchema = new mongoose.Schema({
  AssignmentID: { type: String, required: true, unique: true },
  DriverID:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  TruckID:      { type: mongoose.Schema.Types.ObjectId, ref: 'Truck', required: true },
  StartTime:    { type: Date },
  EndTime:      { type: Date },
});

module.exports = mongoose.model('DriverAssignment', driverAssignmentSchema);