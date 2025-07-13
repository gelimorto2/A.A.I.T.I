const jwt = require('jsonwebtoken');
const { db } = require('../database/init');
const logger = require('../utils/logger');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
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

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
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

module.exports = {
  authenticateToken,
  authenticateSocket,
  requireRole,
  auditLog
};