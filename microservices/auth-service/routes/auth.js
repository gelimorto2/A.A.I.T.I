const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../shared/utils/logger');

module.exports = (db) => {
  const router = express.Router();

  // Helper function to get JWT configuration
  const getJwtConfig = () => {
    return {
      secret: process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    };
  };

  // Helper function to create JWT token
  const createToken = (user) => {
    const jwtConfig = getJwtConfig();
    return jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role,
        email: user.email
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
  };

  // Register new user
  router.post('/register', async (req, res) => {
    try {
      const { username, email, password, firstName, lastName, role = 'user' } = req.body;

      // Validation
      if (!username || !email || !password) {
        return res.status(400).json({ 
          error: 'Username, email, and password are required' 
        });
      }

      if (password.length < 8) {
        return res.status(400).json({ 
          error: 'Password must be at least 8 characters long' 
        });
      }

      // Check if user already exists
      const existingUser = await db.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ 
          error: 'Username or email already exists' 
        });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const result = await db.query(
        `INSERT INTO users (username, email, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, username, email, first_name, last_name, role, created_at`,
        [username, email, passwordHash, firstName, lastName, role]
      );

      const newUser = result.rows[0];

      logger.info(`✅ New user registered successfully`, {
        service: 'auth-service',
        userId: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      });

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          role: newUser.role,
          createdAt: newUser.created_at
        }
      });

    } catch (error) {
      logger.error('❌ Registration error', {
        service: 'auth-service',
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Login
  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ 
          error: 'Username and password are required' 
        });
      }

      // Find user
      const result = await db.query(
        `SELECT id, username, email, password_hash, first_name, last_name, role, is_active 
         FROM users 
         WHERE (username = $1 OR email = $1) AND is_active = true`,
        [username]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ 
          error: 'Invalid credentials' 
        });
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ 
          error: 'Invalid credentials' 
        });
      }

      // Update last login
      await db.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Create session record
      const userAgent = req.headers['user-agent'] || 'Unknown';
      const ipAddress = req.ip || req.connection.remoteAddress;
      
      const token = createToken(user);
      const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
      
      await db.query(
        `INSERT INTO user_sessions (user_id, token_hash, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user.id,
          tokenHash,
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          ipAddress,
          userAgent
        ]
      );

      logger.info(`✅ User logged in successfully`, {
        service: 'auth-service',
        userId: user.id,
        username: user.username,
        ipAddress,
        userAgent: userAgent.substring(0, 100)
      });

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        }
      });

    } catch (error) {
      logger.error('❌ Login error', {
        service: 'auth-service',
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Verify token (for other services)
  router.post('/verify', async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      const jwtConfig = getJwtConfig();
      const decoded = jwt.verify(token, jwtConfig.secret);

      // Check if session is still active
      const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
      const session = await db.query(
        `SELECT s.*, u.is_active as user_active 
         FROM user_sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.token_hash = $1 AND s.is_active = true AND s.expires_at > CURRENT_TIMESTAMP`,
        [tokenHash]
      );

      if (session.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      if (!session.rows[0].user_active) {
        return res.status(401).json({ error: 'User account is inactive' });
      }

      res.json({
        valid: true,
        user: {
          userId: decoded.userId,
          username: decoded.username,
          email: decoded.email,
          role: decoded.role
        }
      });

    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      logger.error('❌ Token verification error', {
        service: 'auth-service',
        error: error.message
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get current user profile
  router.get('/profile', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const jwtConfig = getJwtConfig();
      const decoded = jwt.verify(token, jwtConfig.secret);

      const result = await db.query(
        `SELECT id, username, email, first_name, last_name, role, 
                is_active, email_verified, last_login, created_at, updated_at
         FROM users WHERE id = $1 AND is_active = true`,
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = result.rows[0];
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          isActive: user.is_active,
          emailVerified: user.email_verified,
          lastLogin: user.last_login,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      });

    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      logger.error('❌ Profile retrieval error', {
        service: 'auth-service',
        error: error.message
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Logout (invalidate session)
  router.post('/logout', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');

      // Invalidate session
      await db.query(
        'UPDATE user_sessions SET is_active = false WHERE token_hash = $1',
        [tokenHash]
      );

      logger.info(`✅ User logged out successfully`, {
        service: 'auth-service',
        tokenHash: tokenHash.substring(0, 16) + '...'
      });

      res.json({ message: 'Logout successful' });

    } catch (error) {
      logger.error('❌ Logout error', {
        service: 'auth-service',
        error: error.message
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};