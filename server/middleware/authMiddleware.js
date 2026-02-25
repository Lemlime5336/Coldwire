const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, authorization denied.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, manuId }
    next();
  } catch {
    return res.status(401).json({ message: 'Token invalid or expired.' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
};

const login = async (req, res) => {
  try {
    console.log('1. req.body:', req.body);                          // ← add

    const { UserEmail, Password } = req.body;
    const user = await User.findOne({ UserEmail });

    console.log('2. user found:', user ? user.UserEmail : 'NULL'); // ← add
    console.log('3. IsActive:', user?.IsActive);                   // ← add

    if (!user || !user.IsActive) return res.status(401).json({ message: 'Invalid credentials or account inactive.' });

    const match = await bcrypt.compare(Password, user.Password);
    console.log('4. password match:', match);                      // ← add

    if (!match) return res.status(401).json({ message: 'Invalid credentials.' });

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.UserID, name: user.UserName, role: user.Role, manuId: user.UserManuID },
    });
  } catch (err) {
    console.log('5. ERROR:', err.message);                         // ← add
    res.status(500).json({ message: err.message });
  }
};

module.exports = { protect, adminOnly };
