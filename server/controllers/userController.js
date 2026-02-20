const User = require('../models/User');

// GET /api/users — all users for this manufacturer
const getUsers = async (req, res) => {
  try {
    const users = await User.find({ UserManuID: req.user.manuId }).select('-Password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/users/:id/toggle — toggle IsActive
const toggleUserActive = async (req, res) => {
  try {
    const user = await User.findOne({ UserID: req.params.id });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.IsActive = !user.IsActive;
    await user.save();
    res.json({ message: `User ${user.IsActive ? 'activated' : 'deactivated'}.`, IsActive: user.IsActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getUsers, toggleUserActive };
