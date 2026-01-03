const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { passport } = require('../config/passport');

// These will be injected by server.js
let userManagement = null;

function initializeAuthRoutes(getAllUsersFn, loadUsersFn, saveUsersFn) {
  userManagement = {
    getAllUsers: getAllUsersFn,
    loadUsers: loadUsersFn,
    saveUsers: saveUsersFn
  };
  console.log('✓ Auth routes initialized with user management functions');
}

// Middleware to ensure userManagement is initialized
function ensureInitialized(req, res, next) {
  if (!userManagement) {
    console.error('ERROR: Auth routes not initialized!');
    return res.status(500).json({ message: 'Server configuration error' });
  }
  next();
}

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const existing = await userManagement.getAllUsers().then(users =>
      users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase())
    );
    if (existing) return res.status(400).json({ message: 'Email already in use' });
    const passwordHash = await bcrypt.hash(password, 10);

    const registeredUsers = await userManagement.loadUsers();
    const id = 'user-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    const newUser = {
      userId: name,
      email,
      password: passwordHash,
      id,
      role: 'user',
      department: 'Software Development',
      createdAt: new Date().toISOString()
    };

    registeredUsers.push(newUser);
    await userManagement.saveUsers(registeredUsers);

    res.status(201).json({ id: newUser.id, name: newUser.userId, email: newUser.email, companyId: newUser.companyId });
  } catch (err) {
    next(err);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const allUsers = await userManagement.getAllUsers();
    const user = allUsers.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());

    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({
      id: user.id,
      role: user.role,
      companyId: user.companyId
    }, process.env.JWT_SECRET || 'supersecretkey123', { expiresIn: '1d' });
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

// Google OAuth - Initiate authentication
router.get('/google', ensureInitialized, (req, res, next) => {
  console.log('[OAuth] Initiating Google authentication...');
  // Store department in session if provided
  if (req.query.department) {
    req.session.department = req.query.department;
    console.log('[OAuth] Department stored in session:', req.query.department);
  }

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account', // Force account selection every time
  })(req, res, next);
});

// Google OAuth - Callback
router.get(
  '/google/callback',
  ensureInitialized,
  (req, res, next) => {
    console.log('[OAuth] Callback received from Google');
    next();
  },
  passport.authenticate('google', {
    failureRedirect: '/login?error=google_auth_failed',
    session: true
  }),
  async (req, res) => {
    console.log('[OAuth] Authentication successful, processing user...');
    try {
      const user = req.user;
      console.log('[OAuth] User:', user?.userId || user?.id);

      // If department was stored in session, update user
      if (req.session.department && user.department === 'Software Development') {
        const registeredUsers = await userManagement.loadUsers();
        const userIndex = registeredUsers.findIndex(u => u.id === user.id);

        if (userIndex !== -1) {
          registeredUsers[userIndex].department = req.session.department;
          await userManagement.saveUsers(registeredUsers);
          user.department = req.session.department;
        }

        delete req.session.department;
      }

      // Check if user needs to select department (new Google users)
      if (!user.department || user.department === 'Software Development') {
        // Redirect to department selection page with user ID
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/select-department?userId=${user.id}`);
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          userId: user.userId,
          role: user.role,
          department: user.department,
          companyId: user.companyId
        },
        process.env.JWT_SECRET || 'supersecretkey123',
        { expiresIn: '15m' }
      );

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}&role=${user.role}&department=${user.department}&userId=${user.userId || user.id}&companyId=${user.companyId || ''}`);
    } catch (err) {
      console.error('Google callback error:', err);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/login?error=callback_failed`);
    }
  }
);

// Update user department (for Google OAuth users)
router.post('/update-department', async (req, res, next) => {
  try {
    const { userId, department } = req.body;

    if (!userId || !department) {
      return res.status(400).json({ message: 'User ID and department are required' });
    }

    const allUsers = await userManagement.getAllUsers();
    const user = allUsers.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user in registered users
    const registeredUsers = await userManagement.loadUsers();
    const userIndex = registeredUsers.findIndex(u => u.id === userId);

    if (userIndex !== -1) {
      registeredUsers[userIndex].department = department;
      await userManagement.saveUsers(registeredUsers);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        userId: user.userId,
        role: user.role,
        department: department,
        companyId: user.companyId
      },
      process.env.JWT_SECRET || 'supersecretkey123',
      { expiresIn: '15m' }
    );

    res.json({
      token,
      role: user.role,
      department: department,
      userId: user.userId || user.id
    });
  } catch (err) {
    next(err);
  }
});

module.exports = { router, initializeAuthRoutes };
