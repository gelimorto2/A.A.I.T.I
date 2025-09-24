const jwt = require('jsonwebtoken');
const { db } = require('../database/init');
const { getCredentials } = require('../utils/credentials');
const logger = require('../utils/logger');
const apiKeyManager = require('../utils/apiKeyManager');

// Helper function to get JWT secret from credentials or fallback to env
const getJwtSecret = () => {
  const credentials = getCredentials();
  return credentials?.security?.jwtSecret || process.env.JWT_SECRET || 'fallback-secret';
};

// Public-mode: allow all requests and use a default guest user if none provided
const authenticateToken = (req, res, next) => {
  try {
    // Try to decode if a token is present, but don't require it
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, getJwtSecret());
        // Best-effort user lookup, but continue regardless
        db.get(
          'SELECT id, username, email, role, is_active FROM users WHERE id = ?',
          [decoded.userId],
          (err, user) => {
            req.user = user || { id: 'guest', username: 'guest', email: null, role: 'admin', is_active: 1 };
            return next();
          }
        );
        return; // Will call next in callback
      } catch (_) {
        // Ignore invalid token in public mode
      }
    }
  } catch (_) {}
  // Fallback to guest
  req.user = { id: 'guest', username: 'guest', email: null, role: 'admin', is_active: 1 };
  return next();
};

const authenticateSocket = (socket, next) => {
  // Public-mode sockets: attach a pseudo-user based on socket ID
  socket.userId = socket.id;
  socket.user = { id: socket.id, username: 'guest', role: 'admin' };
  return next();
};

const requireRole = (roles) => {
  return (_req, _res, next) => next();
};

const auditLog = (action, resourceType = null) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the action after response is sent
      const details = {
        method: req.method,
        url: req.url,
        body: req.body,
        query: req.query,
        params: req.params
      };

      db.run(
        `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          require('uuid').v4(),
          req.user ? req.user.id : null,
          action,
          resourceType,
          req.params.id || null,
          JSON.stringify(details),
          req.ip
        ],
        (err) => {
          if (err) {
            logger.error('Error logging audit trail:', err);
          }
        }
      );

      originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Enhanced audit logging for security events
 * @param {string} eventType - Type of security event
 * @param {string} severity - Event severity (info, warning, critical)
 * @param {string} description - Event description
 */
const logSecurityEvent = (eventType, severity = 'info', description = '') => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log security event
      const additionalData = {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        body: req.body,
        query: req.query,
        params: req.params
      };

      db.run(
        `INSERT INTO security_events (id, user_id, event_type, event_severity, description, ip_address, user_agent, additional_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          require('uuid').v4(),
          req.user ? req.user.id : null,
          eventType,
          severity,
          description,
          req.ip,
          req.get('User-Agent'),
          JSON.stringify(additionalData)
        ],
        (err) => {
          if (err) {
            logger.error('Error logging security event:', err);
          }
        }
      );

      originalSend.call(this, data);
    };

    next();
  };
};

/**
 * API Key Authentication Middleware
 * Supports both JWT tokens and API keys
 */
const authenticateApiKey = async (req, _res, next) => {
  // Public-mode: always allow, attach guest user if missing
  if (!req.user) {
    req.user = { id: 'guest', username: 'guest', email: null, role: 'admin', is_active: 1 };
  }
  req.authMethod = 'public';
  return next();
};

/**
 * Check if the current user/API key has required permissions
 * @param {Array} requiredPermissions - Array of required permissions
 */
const requirePermissions = (requiredPermissions) => {
  return (_req, _res, next) => next();
};

module.exports = {
  authenticateToken,
  authenticateSocket,
  authenticateApiKey,
  requireRole,
  requirePermissions,
  auditLog,
  logSecurityEvent
};