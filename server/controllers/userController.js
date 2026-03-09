const User = require('../models/User');
const Delivery = require('../models/Delivery');
const mongoose = require('mongoose');

const getUsers = async (req, res) => {
  try {
    let users = await User.find({
      UserManuID: new mongoose.Types.ObjectId(req.user.manuId),
    }).select('-Password');

    // Filter out drivers with an active delivery
    if (req.query.available === 'true') {
      const activeDeliveries = await Delivery.find({
        DelManuID: new mongoose.Types.ObjectId(req.user.manuId),
        Status: { $ne: 'Complete' },
      }).select('DelUserID');

      const busyDriverIds = new Set(activeDeliveries.map(d => d.DelUserID.toString()));

      users = users.filter(u =>
        u.Role !== 'driver' || !busyDriverIds.has(u._id.toString())
      );
    }

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