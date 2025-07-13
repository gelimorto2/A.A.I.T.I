const express = require('express');
const { db } = require('../database/init');
const { authenticateToken, requireRole, auditLog } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get user profile (already covered in auth, but here for completeness)
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

// Get user's audit trail
router.get('/audit-trail', authenticateToken, (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  db.all(
    `SELECT action, resource_type, resource_id, details, ip_address, timestamp 
     FROM audit_logs 
     WHERE user_id = ? 
     ORDER BY timestamp DESC 
     LIMIT ? OFFSET ?`,
    [req.user.id, parseInt(limit), parseInt(offset)],
    (err, logs) => {
      if (err) {
        logger.error('Error fetching audit trail:', err);
        return res.status(500).json({ error: 'Failed to fetch audit trail' });
      }

      // Parse details JSON for each log entry
      const logsWithParsedDetails = logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null
      }));

      res.json({ logs: logsWithParsedDetails });
    }
  );
});

// Admin only: Get all users
router.get('/', authenticateToken, requireRole(['admin']), (req, res) => {
  db.all(
    'SELECT id, username, email, role, created_at, last_login, is_active FROM users ORDER BY created_at DESC',
    [],
    (err, users) => {
      if (err) {
        logger.error('Error fetching users:', err);
        return res.status(500).json({ error: 'Failed to fetch users' });
      }

      res.json({ users });
    }
  );
});

// Admin only: Update user role or status
router.put('/:userId', authenticateToken, requireRole(['admin']), auditLog('user_update', 'user'), (req, res) => {
  const { role, is_active } = req.body;
  
  if (!role && is_active === undefined) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const updates = [];
  const params = [];

  if (role) {
    const validRoles = ['admin', 'trader', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    updates.push('role = ?');
    params.push(role);
  }

  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.userId);

  const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

  db.run(query, params, function(err) {
    if (err) {
      logger.error('Error updating user:', err);
      return res.status(500).json({ error: 'Failed to update user' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`User updated: ${req.params.userId} by admin ${req.user.username}`);
    res.json({ message: 'User updated successfully' });
  });
});

// Admin only: Get system statistics
router.get('/system/stats', authenticateToken, requireRole(['admin']), (req, res) => {
  const stats = {};

  // Get user count
  db.get('SELECT COUNT(*) as count FROM users WHERE is_active = 1', [], (err, result) => {
    if (err) {
      logger.error('Error fetching user count:', err);
      return res.status(500).json({ error: 'Failed to fetch statistics' });
    }
    
    stats.active_users = result.count;

    // Get bot count
    db.get('SELECT COUNT(*) as count FROM bots', [], (err, result) => {
      if (err) {
        logger.error('Error fetching bot count:', err);
        return res.status(500).json({ error: 'Failed to fetch statistics' });
      }
      
      stats.total_bots = result.count;

      // Get running bot count
      db.get('SELECT COUNT(*) as count FROM bots WHERE status = "running"', [], (err, result) => {
        if (err) {
          logger.error('Error fetching running bot count:', err);
          return res.status(500).json({ error: 'Failed to fetch statistics' });
        }
        
        stats.running_bots = result.count;

        // Get total trades count
        db.get('SELECT COUNT(*) as count FROM trades', [], (err, result) => {
          if (err) {
            logger.error('Error fetching trade count:', err);
            return res.status(500).json({ error: 'Failed to fetch statistics' });
          }
          
          stats.total_trades = result.count;

          // Get total PnL
          db.get('SELECT COALESCE(SUM(pnl), 0) as total_pnl FROM trades WHERE status = "closed"', [], (err, result) => {
            if (err) {
              logger.error('Error fetching total PnL:', err);
              return res.status(500).json({ error: 'Failed to fetch statistics' });
            }
            
            stats.total_pnl = result.total_pnl;

            res.json({ stats });
          });
        });
      });
    });
  });
});

// Admin only: Get audit trail for all users
router.get('/system/audit', authenticateToken, requireRole(['admin']), (req, res) => {
  const { limit = 100, offset = 0, user_id, action } = req.query;
  
  let query = `
    SELECT al.*, u.username 
    FROM audit_logs al 
    LEFT JOIN users u ON al.user_id = u.id 
    WHERE 1=1
  `;
  const params = [];

  if (user_id) {
    query += ' AND al.user_id = ?';
    params.push(user_id);
  }

  if (action) {
    query += ' AND al.action = ?';
    params.push(action);
  }

  query += ' ORDER BY al.timestamp DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, logs) => {
    if (err) {
      logger.error('Error fetching system audit trail:', err);
      return res.status(500).json({ error: 'Failed to fetch audit trail' });
    }

    // Parse details JSON for each log entry
    const logsWithParsedDetails = logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null
    }));

    res.json({ logs: logsWithParsedDetails });
  });
});

module.exports = router;