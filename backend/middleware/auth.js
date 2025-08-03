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

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, getJwtSecret(), (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Verify user still exists and is active
    db.get(
      'SELECT id, username, email, role, is_active FROM users WHERE id = ?',
      [decoded.userId],
      (err, user) => {
        if (err) {
          logger.error('Database error during token verification:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (!user || !user.is_active) {
          return res.status(403).json({ error: 'User account not found or inactive' });
        }

        req.user = user;
        next();
      }
    );
  });
};

const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  jwt.verify(token, getJwtSecret(), (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error: Invalid token'));
    }

    // Verify user exists and is active
    db.get(
      'SELECT id, username, email, role, is_active FROM users WHERE id = ?',
      [decoded.userId],
      (err, user) => {
        if (err) {
          logger.error('Database error during socket authentication:', err);
          return next(new Error('Authentication error: Database error'));
        }

        if (!user || !user.is_active) {
          return next(new Error('Authentication error: User not found or inactive'));
        }

        socket.userId = user.id;
        socket.user = user;
        next();
      }
    );
  });
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
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
const authenticateApiKey = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const apiKey = req.headers['x-api-key'];

  // If API key is provided, use API key authentication
  if (apiKey) {
    try {
      const keyData = await apiKeyManager.validateKey(apiKey);
      
      if (!keyData) {
        // Log failed API key attempt
        db.run(
          `INSERT INTO security_events (id, event_type, event_severity, description, ip_address, user_agent, additional_data)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            require('uuid').v4(),
            'api_key_authentication_failed',
            'warning',
            'Invalid API key authentication attempt',
            req.ip,
            req.get('User-Agent'),
            JSON.stringify({ apiKey: apiKey.substring(0, 8) + '...' })
          ]
        );
        
        return res.status(401).json({ error: 'Invalid API key' });
      }

      // Set user data from API key
      req.user = {
        id: keyData.userId,
        username: keyData.username,
        email: keyData.email,
        role: keyData.role
      };
      req.apiKeyData = keyData;
      req.authMethod = 'api_key';

      next();
    } catch (error) {
      logger.error('API key authentication error:', error);
      return res.status(500).json({ error: 'Authentication service error' });
    }
  }
  // Otherwise, fall back to JWT authentication
  else if (authHeader) {
    authenticateToken(req, res, next);
  }
  // No authentication provided
  else {
    return res.status(401).json({ error: 'Authentication required (JWT token or API key)' });
  }
};

/**
 * Check if the current user/API key has required permissions
 * @param {Array} requiredPermissions - Array of required permissions
 */
const requirePermissions = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // If authenticated via API key, check API key permissions
    if (req.authMethod === 'api_key' && req.apiKeyData) {
      const hasPermission = requiredPermissions.every(permission => 
        req.apiKeyData.permissions.includes(permission) || 
        req.apiKeyData.permissions.includes('all')
      );

      if (!hasPermission) {
        // Log permission denial
        db.run(
          `INSERT INTO security_events (id, user_id, event_type, event_severity, description, ip_address, additional_data)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            require('uuid').v4(),
            req.user.id,
            'permission_denied',
            'warning',
            `Access denied - insufficient API key permissions`,
            req.ip,
            JSON.stringify({ 
              required: requiredPermissions, 
              available: req.apiKeyData.permissions,
              keyName: req.apiKeyData.name
            })
          ]
        );

        return res.status(403).json({ 
          error: 'Insufficient API key permissions',
          required: requiredPermissions,
          available: req.apiKeyData.permissions
        });
      }
    }
    // For JWT authentication, use role-based access (existing logic)
    else {
      // Convert permissions to roles for backward compatibility
      const allowedRoles = requiredPermissions.includes('admin') ? ['admin'] : ['admin', 'trader'];
      
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    next();
  };
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