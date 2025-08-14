const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');
const logger = require('../utils/logger');

// Role definitions - should match frontend
const ROLE_DEFINITIONS = {
  admin: {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full system access with administrative privileges',
    permissions: ['*'],
    hierarchy: 100,
  },
  trader: {
    name: 'trader',
    displayName: 'Trader',
    description: 'Full trading access with portfolio management',
    permissions: [
      'trading.create', 'trading.read', 'trading.update', 'trading.delete',
      'portfolio.read', 'portfolio.update',
      'bots.create', 'bots.read', 'bots.update', 'bots.delete',
      'analytics.read', 'settings.read', 'settings.update',
    ],
    hierarchy: 75,
  },
  analyst: {
    name: 'analyst',
    displayName: 'Analyst',
    description: 'Read-only access to analytics and reports',
    permissions: [
      'analytics.read', 'portfolio.read', 'bots.read',
      'trading.read', 'reports.read', 'reports.create',
    ],
    hierarchy: 50,
  },
  viewer: {
    name: 'viewer',
    displayName: 'Viewer',
    description: 'Limited read-only access to basic information',
    permissions: ['dashboard.read', 'portfolio.read', 'analytics.read'],
    hierarchy: 25,
  },
};

/**
 * Get user permissions based on role
 * GET /api/rbac/permissions
 */
router.get('/permissions', authenticateToken, (req, res) => {
  try {
    const userRole = req.user.role || 'viewer';
    const roleDefinition = ROLE_DEFINITIONS[userRole];
    
    if (!roleDefinition) {
      return res.status(400).json({ error: 'Invalid user role' });
    }

    res.json({
      role: userRole,
      permissions: roleDefinition.permissions,
      hierarchy: roleDefinition.hierarchy,
      displayName: roleDefinition.displayName,
      description: roleDefinition.description,
    });
  } catch (error) {
    logger.error('Error getting user permissions:', error);
    res.status(500).json({ error: 'Failed to get permissions' });
  }
});

/**
 * Check if user has specific permission
 * POST /api/rbac/check-permission
 */
router.post('/check-permission', authenticateToken, (req, res) => {
  try {
    const { permission } = req.body;
    const userRole = req.user.role || 'viewer';
    const roleDefinition = ROLE_DEFINITIONS[userRole];

    if (!roleDefinition) {
      return res.json({ hasPermission: false });
    }

    // Admin has all permissions
    if (userRole === 'admin') {
      return res.json({ hasPermission: true });
    }

    // Check if user has specific permission
    const hasPermission = roleDefinition.permissions.includes(permission) || 
                         roleDefinition.permissions.includes('*');

    res.json({ hasPermission });
  } catch (error) {
    logger.error('Error checking permission:', error);
    res.status(500).json({ error: 'Failed to check permission' });
  }
});

/**
 * Get all role definitions (admin only)
 * GET /api/rbac/roles
 */
router.get('/roles', authenticateToken, requireRole(['admin']), (req, res) => {
  try {
    res.json({ roles: ROLE_DEFINITIONS });
  } catch (error) {
    logger.error('Error getting roles:', error);
    res.status(500).json({ error: 'Failed to get roles' });
  }
});

/**
 * Update user role (admin only)
 * PUT /api/rbac/users/:userId/role
 */
router.put('/users/:userId/role', 
  authenticateToken, 
  requireRole(['admin']), 
  auditLog('user_role_update', 'user'),
  (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!ROLE_DEFINITIONS[role]) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      // In a real implementation, this would update the database
      logger.info(`Role update requested for user ${userId} to ${role} by ${req.user.username}`);

      res.json({ 
        message: 'User role updated successfully',
        userId,
        newRole: role,
        updatedBy: req.user.username,
      });
    } catch (error) {
      logger.error('Error updating user role:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }
);

/**
 * Get user activity logs (admin and analysts)
 * GET /api/rbac/activity
 */
router.get('/activity', 
  authenticateToken, 
  requireRole(['admin', 'analyst']), 
  (req, res) => {
    try {
      const { limit = 50, offset = 0, userId, action, dateFrom, dateTo } = req.query;

      // In a real implementation, this would query the database
      // For now, return sample activity data
      const sampleActivities = [
        {
          id: 'activity-1',
          userId: req.user.id,
          username: req.user.username,
          action: 'login',
          resource: 'session',
          timestamp: new Date().toISOString(),
          success: true,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        },
        {
          id: 'activity-2',
          userId: req.user.id,
          username: req.user.username,
          action: 'view_dashboard',
          resource: 'dashboard',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          success: true,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        },
      ];

      res.json({
        activities: sampleActivities,
        total: sampleActivities.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      logger.error('Error getting activity logs:', error);
      res.status(500).json({ error: 'Failed to get activity logs' });
    }
  }
);

/**
 * Log user activity
 * POST /api/rbac/activity
 */
router.post('/activity', authenticateToken, (req, res) => {
  try {
    const { action, resource, details } = req.body;

    const activity = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: req.user.id,
      username: req.user.username,
      action,
      resource,
      details,
      timestamp: new Date().toISOString(),
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    // In a real implementation, this would be stored in the database
    logger.info('User activity logged:', activity);

    res.json({ 
      message: 'Activity logged successfully',
      activityId: activity.id,
    });
  } catch (error) {
    logger.error('Error logging activity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

/**
 * Get activity statistics (admin only)
 * GET /api/rbac/activity/stats
 */
router.get('/activity/stats', 
  authenticateToken, 
  requireRole(['admin']), 
  (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;

      // In a real implementation, this would calculate from database
      const stats = {
        totalActivities: 1247,
        uniqueUsers: 23,
        mostActiveUser: req.user.username,
        commonActions: [
          { action: 'view_dashboard', count: 456 },
          { action: 'login', count: 234 },
          { action: 'view_analytics', count: 187 },
          { action: 'create_bot', count: 89 },
          { action: 'update_settings', count: 67 },
        ],
        activityByHour: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          count: Math.floor(Math.random() * 50) + 10,
        })),
        activityByDay: Array.from({ length: 7 }, (_, day) => ({
          date: new Date(Date.now() - day * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          count: Math.floor(Math.random() * 200) + 50,
        })),
        errorRate: 0.023,
        averageSessionDuration: 1847000, // milliseconds
      };

      res.json(stats);
    } catch (error) {
      logger.error('Error getting activity stats:', error);
      res.status(500).json({ error: 'Failed to get activity stats' });
    }
  }
);

module.exports = router;