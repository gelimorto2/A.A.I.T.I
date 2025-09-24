const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/init');
const { authenticateToken, authenticateApiKey, auditLog } = require('../middleware/auth');
const { getCredentials } = require('../utils/credentials');
const logger = require('../utils/logger');

const router = express.Router();
const { validate, schemas } = require('../utils/validation');

// Helper function to get JWT configuration from credentials
const getJwtConfig = () => {
  const credentials = getCredentials();
  return {
    secret: credentials?.security?.jwtSecret || process.env.JWT_SECRET || 'fallback-secret',
    expiresIn: credentials?.system?.jwtExpiresIn || process.env.JWT_EXPIRES_IN || '7d'
  };
};

// Register new user
router.post('/register', validate(schemas.registerSchema), auditLog('user_register'), async (req, res) => {
  try {
    const { username, email, password, role = 'trader' } = req.validated;

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

// Login (supports username OR email as identifier)
router.post('/login', validate(schemas.loginSchema), auditLog('user_login'), async (req, res) => {
  try {
    const { username, email, password } = req.validated;
    const identifier = username || email; // allow either field

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    // Find user by username or email
    db.get(
      'SELECT id, username, email, password_hash, role, is_active FROM users WHERE username = ? OR email = ?',
      [identifier, identifier],
      async (err, user) => {
        if (err) {
          logger.error('Database error during login', { error: err.message, identifier });
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (!user) {
          logger.warn('Login attempt for non-existent user', { identifier });
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!user.is_active) {
          logger.warn('Login attempt for inactive user', { identifier, userId: user.id });
          return res.status(401).json({ error: 'Invalid credentials or inactive account' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
          logger.warn('Invalid password attempt', { identifier, userId: user.id });
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login (non-blocking)
        db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

        // Generate JWT
        const jwtConfig = getJwtConfig();
        const token = jwt.sign(
          { userId: user.id, username: user.username, role: user.role },
          jwtConfig.secret,
          { expiresIn: jwtConfig.expiresIn }
        );

        logger.info('User logged in', { username: user.username, userId: user.id, role: user.role });
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
    logger.error('Login error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile (supports JWT or API Key)
router.get('/profile', authenticateApiKey, (req, res) => {
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
  const jwtConfig = getJwtConfig();
  const newToken = jwt.sign(
    { userId: req.user.id, username: req.user.username, role: req.user.role },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
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