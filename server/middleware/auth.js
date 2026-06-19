const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { HARDCODED_USERS, DEFAULT_JWT_SECRET } = require('../config/constants');

module.exports = async function (req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  try {
    const decoded = jwt.verify(token, secret);
    
    // First check hardcoded users
    let user = HARDCODED_USERS.find(u => u.id === decoded.id || u.userId === decoded.userId);
    
    if (user) {
      // Map id to _id for compatibility with Mongoose-style routes
      req.user = { ...user, _id: user.id };
    } else {
      // Then check MongoDB
      user = await User.findById(decoded.id).select('-passwordHash');
      if (!user) return res.status(401).json({ message: 'User not found' });
      req.user = user;
    }
    
    next();
  } catch (err) {
    console.error('!!! AUTH MIDDLEWARE ERROR !!!', err);
    return res.status(401).json({ message: 'Invalid token', error: err.message });
  }
};
