const mongoose = require('mongoose');

const driverAssignmentSchema = new mongoose.Schema({
  AssignmentID: { type: String, required: true, unique: true },
  DriverID:     { type: String, required: true }, // FK → User (driver)
  TruckID:      { type: String, required: true }, // FK → Truck
  StartTime:    { type: Date },
  EndTime:      { type: Date },
});

module.exports = mongoose.model('DriverAssignment', driverAssignmentSchema);
