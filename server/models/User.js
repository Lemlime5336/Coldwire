const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  UserID:     { type: String, required: true, unique: true },
  UserManuID: { type: mongoose.Schema.Types.ObjectId, ref: 'Manufacturer', required: true },
  UserName:   { type: String, required: true },
  UserEmail:  { type: String, required: true, unique: true },
  Password:   { type: String, required: true },
  Role:       { type: String, enum: ['admin', 'driver'], required: true },
  IsActive:   { type: Boolean, default: true },
  CreatedAt:  { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);