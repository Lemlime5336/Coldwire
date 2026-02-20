const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (user) =>
  jwt.sign(
    { id: user.UserID, role: user.Role, manuId: user.UserManuID },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// POST /api/auth/register  (admin only — creates driver accounts)
const register = async (req, res) => {
  try {
    const { UserID, UserName, UserEmail, Password, Role, UserManuID } = req.body;
    const existing = await User.findOne({ UserEmail });
    if (existing) return res.status(400).json({ message: 'Email already in use.' });

    const hashed = await bcrypt.hash(Password, 10);
    const user = await User.create({ UserID, UserManuID, UserName, UserEmail, Password: hashed, Role });
    res.status(201).json({ message: 'User created.', userId: user.UserID });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { UserEmail, Password } = req.body;
    const user = await User.findOne({ UserEmail });
    if (!user || !user.IsActive) return res.status(401).json({ message: 'Invalid credentials or account inactive.' });

    const match = await bcrypt.compare(Password, user.Password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials.' });

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.UserID, name: user.UserName, role: user.Role, manuId: user.UserManuID },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/logout  (stateless — client discards token)
const logout = (req, res) => res.json({ message: 'Logged out.' });

module.exports = { register, login, logout };
