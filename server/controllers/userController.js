const User = require('../models/User');
const mongoose = require('mongoose');

const getUsers = async (req, res) => {
  try {
    const users = await User.find({ UserManuID: new mongoose.Types.ObjectId(req.user.manuId) }).select('-Password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const toggleUserActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.IsActive = !user.IsActive;
    await user.save();
    res.json({ message: `User ${user.IsActive ? 'activated' : 'deactivated'}.`, IsActive: user.IsActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getUsers, toggleUserActive };