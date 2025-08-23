const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');
const { db } = require('../database/init');

// Create user activity table if it doesn't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS user_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      resource TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      session_id TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      duration_ms INTEGER,
      success BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Create indexes for better performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp ON user_activity(timestamp)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_user_activity_action ON user_activity(action)`);
});

/**
 * Middleware to track user activity automatically
 */
const trackActivity = (action, resource = null) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Store original res.json method
    const originalJson = res.json;
    
    // Override res.json to capture when response is sent
    res.json = function(data) {
      const duration = Date.now() - startTime;
      const success = res.statusCode < 400;
      
      // Record activity
      if (req.user) {
        try {
          db.run(`
            INSERT INTO user_activity (user_id, action, resource, details, ip_address, user_agent, session_id, duration_ms, success)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            req.user.id,
            action,
            resource,
            JSON.stringify({
              method: req.method,
              url: req.originalUrl,
              params: req.params,
              query: req.query,
              responseCode: res.statusCode
            }),
            req.ip || req.connection.remoteAddress,
            req.get('User-Agent'),
            req.sessionID,
            duration,
            success ? 1 : 0
          ]);
        } catch (error) {
          logger.error('Failed to track user activity:', error);
        }
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Get user activity analytics
 */
router.get('/analytics', authenticateToken, (req, res) => {
  try {
    const { timeframe = '7d', user_id } = req.query;
    
    // Only allow users to see their own activity, unless admin
    const targetUserId = req.user.role === 'admin' && user_id ? user_id : req.user.id;
    
    // Calculate date range
    let dateFilter = '';
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    dateFilter = ` AND timestamp >= '${startDate.toISOString()}'`;
    
    // Get activity summary
    db.get(`
      SELECT 
        COUNT(*) as total_actions,
        COUNT(DISTINCT action) as unique_actions,
        AVG(duration_ms) as avg_response_time,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_actions,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_actions,
        COUNT(DISTINCT strftime('%Y-%m-%d', timestamp)) as active_days
      FROM user_activity 
      WHERE user_id = ?${dateFilter}
    `, [targetUserId], (err, summary) => {
      if (err) {
        logger.error('Error fetching user activity summary:', err);
        return res.status(500).json({ error: 'Failed to fetch activity summary' });
      }

      // Get activity by action
      db.all(`
        SELECT 
          action,
          COUNT(*) as count,
          AVG(duration_ms) as avg_duration,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
          SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as error_count
        FROM user_activity 
        WHERE user_id = ?${dateFilter}
        GROUP BY action
        ORDER BY count DESC
        LIMIT 10
      `, [targetUserId], (err, actionStats) => {
        if (err) {
          logger.error('Error fetching action stats:', err);
          return res.status(500).json({ error: 'Failed to fetch action statistics' });
        }

        // Get recent activity
        db.all(`
          SELECT 
            action,
            resource,
            timestamp,
            duration_ms,
            success,
            ip_address
          FROM user_activity 
          WHERE user_id = ?${dateFilter}
          ORDER BY timestamp DESC
          LIMIT 20
        `, [targetUserId], (err, recentActivity) => {
          if (err) {
            logger.error('Error fetching recent activity:', err);
            return res.status(500).json({ error: 'Failed to fetch recent activity' });
          }

          res.json({
            timeframe,
            summary: summary || {
              total_actions: 0,
              unique_actions: 0,
              avg_response_time: 0,
              successful_actions: 0,
              failed_actions: 0,
              active_days: 0
            },
            actionStats: actionStats || [],
            timeStats: [], // Simplified for now
            resourceStats: [], // Simplified for now
            recentActivity: recentActivity || []
          });
        });
      });
    });
    
  } catch (error) {
    logger.error('Error fetching user activity analytics:', error);
    res.status(500).json({ error: 'Failed to fetch user activity analytics' });
  }
});

/**
 * Manual activity tracking endpoint
 */
router.post('/track', authenticateToken, (req, res) => {
  try {
    const { action, resource, details } = req.body;
    
    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }
    
    db.run(`
      INSERT INTO user_activity (user_id, action, resource, details, ip_address, user_agent, session_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user.id,
      action,
      resource,
      JSON.stringify(details || {}),
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent'),
      req.sessionID
    ], function(err) {
      if (err) {
        logger.error('Error tracking activity:', err);
        return res.status(500).json({ error: 'Failed to track activity' });
      }

      res.json({ 
        success: true, 
        activityId: this.lastID,
        message: 'Activity tracked successfully'
      });
    });
    
  } catch (error) {
    logger.error('Error tracking activity:', error);
    res.status(500).json({ error: 'Failed to track activity' });
  }
});

module.exports = { router, trackActivity };