/**
 * RBAC Middleware
 * Enforces role-based access control on routes
 */

const { getInstance: getRBACSystem, RESOURCES, ACTIONS } = require('../services/rbacSystem');
const logger = require('../utils/logger');

/**
 * Create RBAC middleware for route protection
 * @param {string} resource - Resource being accessed
 * @param {string} action - Action being performed
 * @param {Function} ownerIdExtractor - Optional function to extract resource owner ID from req
 */
function requirePermission(resource, action, ownerIdExtractor = null) {
  return async (req, res, next) => {
    try {
      const rbac = getRBACSystem();
      
      // Check if user is authenticated
      if (!req.user) {
        logger.warn('RBAC: Unauthenticated access attempt', {
          path: req.path,
          method: req.method,
          ip: req.ip
        });
        
        return res.status(401).json({
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
      }

      // Extract resource owner ID if extractor provided
      let resourceOwnerId = null;
      if (ownerIdExtractor) {
        try {
          resourceOwnerId = ownerIdExtractor(req);
        } catch (error) {
          logger.error('RBAC: Owner ID extraction failed', {
            error: error.message,
            path: req.path
          });
        }
      }

      // Check permission
      const hasPermission = rbac.hasPermission(
        req.user,
        resource,
        action,
        resourceOwnerId
      );

      if (!hasPermission) {
        logger.warn('RBAC: Access denied', {
          userId: req.user.id,
          role: req.user.role,
          resource,
          action,
          path: req.path,
          method: req.method
        });

        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
          required: {
            resource,
            action
          },
          current: {
            role: req.user.role
          }
        });
      }

      // Permission granted
      req.rbac = {
        resource,
        action,
        granted: true
      };

      next();

    } catch (error) {
      logger.error('RBAC middleware error', {
        error: error.message,
        stack: error.stack,
        path: req.path
      });

      return res.status(500).json({
        error: 'Authorization system error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}

/**
 * Require specific role
 * @param {string[]} allowedRoles - Array of allowed role IDs
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('RBAC: Role check failed', {
          userId: req.user.id,
          userRole: req.user.role,
          required: allowedRoles,
          path: req.path
        });

        return res.status(403).json({
          error: 'Insufficient role',
          code: 'FORBIDDEN',
          required: allowedRoles,
          current: req.user.role
        });
      }

      next();
    } catch (error) {
      logger.error('Role middleware error', {
        error: error.message,
        path: req.path
      });

      return res.status(500).json({
        error: 'Authorization system error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}

/**
 * Check if user owns resource
 * @param {Function} ownerIdExtractor - Function to extract owner ID from request
 */
function requireOwnership(ownerIdExtractor) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
      }

      let resourceOwnerId;
      try {
        resourceOwnerId = ownerIdExtractor(req);
      } catch (error) {
        logger.error('Ownership check: Owner ID extraction failed', {
          error: error.message,
          path: req.path
        });

        return res.status(400).json({
          error: 'Invalid resource reference',
          code: 'BAD_REQUEST'
        });
      }

      if (req.user.id !== resourceOwnerId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        logger.warn('RBAC: Ownership check failed', {
          userId: req.user.id,
          resourceOwnerId,
          path: req.path
        });

        return res.status(403).json({
          error: 'Not resource owner',
          code: 'FORBIDDEN'
        });
      }

      req.isOwner = true;
      next();
    } catch (error) {
      logger.error('Ownership middleware error', {
        error: error.message,
        path: req.path
      });

      return res.status(500).json({
        error: 'Authorization system error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}

/**
 * Attach user permissions to request
 */
function attachPermissions() {
  return (req, res, next) => {
    try {
      if (!req.user) {
        req.permissions = null;
        return next();
      }

      const rbac = getRBACSystem();
      req.permissions = rbac.getRolePermissions(req.user.role);
      
      next();
    } catch (error) {
      logger.error('Permissions attachment error', {
        error: error.message,
        path: req.path
      });

      // Don't block request on permission attachment error
      req.permissions = null;
      next();
    }
  };
}

/**
 * Common permission shortcuts
 */
const permissions = {
  // User management
  readUsers: requirePermission(RESOURCES.USERS, ACTIONS.READ),
  createUsers: requirePermission(RESOURCES.USERS, ACTIONS.CREATE),
  updateUsers: requirePermission(RESOURCES.USERS, ACTIONS.UPDATE),
  deleteUsers: requirePermission(RESOURCES.USERS, ACTIONS.DELETE),
  manageUsers: requirePermission(RESOURCES.USERS, ACTIONS.MANAGE),

  // Trading
  readTrading: requirePermission(RESOURCES.TRADING, ACTIONS.READ),
  createTrade: requirePermission(RESOURCES.TRADING, ACTIONS.CREATE),
  updateTrade: requirePermission(RESOURCES.TRADING, ACTIONS.UPDATE),
  deleteTrade: requirePermission(RESOURCES.TRADING, ACTIONS.DELETE),
  executeTrade: requirePermission(RESOURCES.TRADING, ACTIONS.EXECUTE),

  // Strategies
  readStrategies: requirePermission(RESOURCES.STRATEGIES, ACTIONS.READ),
  createStrategy: requirePermission(RESOURCES.STRATEGIES, ACTIONS.CREATE),
  updateStrategy: requirePermission(RESOURCES.STRATEGIES, ACTIONS.UPDATE),
  deleteStrategy: requirePermission(RESOURCES.STRATEGIES, ACTIONS.DELETE),
  executeStrategy: requirePermission(RESOURCES.STRATEGIES, ACTIONS.EXECUTE),
  approveStrategy: requirePermission(RESOURCES.STRATEGIES, ACTIONS.APPROVE),
  deployStrategy: requirePermission(RESOURCES.STRATEGIES, ACTIONS.DEPLOY),

  // ML Models
  readModels: requirePermission(RESOURCES.ML_MODELS, ACTIONS.READ),
  createModel: requirePermission(RESOURCES.ML_MODELS, ACTIONS.CREATE),
  updateModel: requirePermission(RESOURCES.ML_MODELS, ACTIONS.UPDATE),
  deleteModel: requirePermission(RESOURCES.ML_MODELS, ACTIONS.DELETE),
  executeModel: requirePermission(RESOURCES.ML_MODELS, ACTIONS.EXECUTE),
  approveModel: requirePermission(RESOURCES.ML_MODELS, ACTIONS.APPROVE),
  deployModel: requirePermission(RESOURCES.ML_MODELS, ACTIONS.DEPLOY),

  // Portfolio
  readPortfolio: requirePermission(RESOURCES.PORTFOLIO, ACTIONS.READ),
  updatePortfolio: requirePermission(RESOURCES.PORTFOLIO, ACTIONS.UPDATE),
  managePortfolio: requirePermission(RESOURCES.PORTFOLIO, ACTIONS.MANAGE),

  // Analytics
  readAnalytics: requirePermission(RESOURCES.ANALYTICS, ACTIONS.READ),
  createAnalytics: requirePermission(RESOURCES.ANALYTICS, ACTIONS.CREATE),
  executeAnalytics: requirePermission(RESOURCES.ANALYTICS, ACTIONS.EXECUTE),

  // Backtest
  readBacktest: requirePermission(RESOURCES.BACKTEST, ACTIONS.READ),
  createBacktest: requirePermission(RESOURCES.BACKTEST, ACTIONS.CREATE),
  executeBacktest: requirePermission(RESOURCES.BACKTEST, ACTIONS.EXECUTE),

  // Settings
  readSettings: requirePermission(RESOURCES.SETTINGS, ACTIONS.READ),
  updateSettings: requirePermission(RESOURCES.SETTINGS, ACTIONS.UPDATE),
  manageSettings: requirePermission(RESOURCES.SETTINGS, ACTIONS.MANAGE),

  // Logs
  readLogs: requirePermission(RESOURCES.LOGS, ACTIONS.READ),
  manageLogs: requirePermission(RESOURCES.LOGS, ACTIONS.MANAGE),

  // Admin
  readAdmin: requirePermission(RESOURCES.ADMIN, ACTIONS.READ),
  manageAdmin: requirePermission(RESOURCES.ADMIN, ACTIONS.MANAGE)
};

module.exports = {
  requirePermission,
  requireRole,
  requireOwnership,
  attachPermissions,
  permissions
};
