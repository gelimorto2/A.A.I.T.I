const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/init');
const { authenticateToken, auditLog } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Register new user
router.post('/register', auditLog('user_register'), async (req, res) => {
  try {
    const { username, email, password, role = 'trader' } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Check if user already exists
    db.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email],
      async (err, existingUser) => {
        if (err) {
          logger.error('Database error during registration:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (existingUser) {
          return res.status(409).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const userId = uuidv4();
        db.run(
          `INSERT INTO users (id, username, email, password_hash, role)
           VALUES (?, ?, ?, ?, ?)`,
          [userId, username, email, passwordHash, role],
          function(err) {
            if (err) {
              logger.error('Error creating user:', err);
              return res.status(500).json({ error: 'Failed to create user' });
            }

            logger.info(`New user registered: ${username}`);
            res.status(201).json({
              message: 'User created successfully',
              user: {
                id: userId,
                username,
                email,
                role
              }
            });
          }
        );
      }
    );
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', auditLog('user_login'), async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    db.get(
      'SELECT id, username, email, password_hash, role, is_active FROM users WHERE username = ? OR email = ?',
      [username, username],
      async (err, user) => {
        if (err) {
          logger.error('Database error during login:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (!user || !user.is_active) {
          return res.status(401).json({ error: 'Invalid credentials or inactive account' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        db.run(
          'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
          [user.id]
        );

        // Generate JWT
        const token = jwt.sign(
          { userId: user.id, username: user.username, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        logger.info(`User logged in: ${user.username}`);
        res.json({
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        });
      }
    );
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Refresh token
router.post('/refresh', authenticateToken, (req, res) => {
  const newToken = jwt.sign(
    { userId: req.user.id, username: req.user.username, role: req.user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.json({
    message: 'Token refreshed successfully',
    token: newToken
  });
});

// Logout (client-side token removal, but log the event)
router.post('/logout', authenticateToken, auditLog('user_logout'), (req, res) => {
  logger.info(`User logged out: ${req.user.username}`);
  res.json({ message: 'Logout successful' });
});

module.exports = router;