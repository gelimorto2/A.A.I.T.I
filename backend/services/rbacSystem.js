/**
 * Sprint 4: RBAC Security System
 * Role-Based Access Control with Permission Matrix
 * 
 * Implements enterprise-grade authorization with:
 * - Role hierarchy and inheritance
 * - Fine-grained permission matrix
 * - Resource-level access control
 * - Audit trail for all authorization decisions
 */

const logger = require('../utils/logger');

// Define roles with hierarchy (higher number = more privileges)
const ROLES = {
  GUEST: {
    id: 'guest',
    level: 0,
    name: 'Guest',
    description: 'Read-only access to public data'
  },
  USER: {
    id: 'user',
    level: 10,
    name: 'User',
    description: 'Basic trading and portfolio management'
  },
  TRADER: {
    id: 'trader',
    level: 20,
    name: 'Trader',
    description: 'Full trading capabilities and strategy management'
  },
  ANALYST: {
    id: 'analyst',
    level: 30,
    name: 'Analyst',
    description: 'Advanced analytics, backtesting, and model validation'
  },
  MANAGER: {
    id: 'manager',
    level: 40,
    name: 'Manager',
    description: 'Team management and strategy approval'
  },
  ADMIN: {
    id: 'admin',
    level: 50,
    name: 'Administrator',
    description: 'Full system administration'
  },
  SUPERADMIN: {
    id: 'superadmin',
    level: 100,
    name: 'Super Administrator',
    description: 'Unrestricted access to all system functions'
  }
};

// Define resources
const RESOURCES = {
  USERS: 'users',
  TRADING: 'trading',
  STRATEGIES: 'strategies',
  ML_MODELS: 'ml_models',
  PORTFOLIO: 'portfolio',
  ANALYTICS: 'analytics',
  BACKTEST: 'backtest',
  SETTINGS: 'settings',
  LOGS: 'logs',
  ADMIN: 'admin'
};

// Define actions
const ACTIONS = {
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  EXECUTE: 'execute',
  APPROVE: 'approve',
  DEPLOY: 'deploy',
  MANAGE: 'manage'
};

// Permission Matrix
// Format: [resource][action] = [minimum required role level]
const PERMISSION_MATRIX = {
  [RESOURCES.USERS]: {
    [ACTIONS.READ]: ROLES.USER.level,      // Users can read own profile
    [ACTIONS.CREATE]: ROLES.ADMIN.level,    // Only admin can create users
    [ACTIONS.UPDATE]: ROLES.USER.level,     // Users can update own profile
    [ACTIONS.DELETE]: ROLES.ADMIN.level,    // Only admin can delete users
    [ACTIONS.MANAGE]: ROLES.MANAGER.level   // Managers can manage team
  },
  
  [RESOURCES.TRADING]: {
    [ACTIONS.READ]: ROLES.USER.level,       // Users can view trading
    [ACTIONS.CREATE]: ROLES.TRADER.level,   // Traders can create orders
    [ACTIONS.UPDATE]: ROLES.TRADER.level,   // Traders can modify orders
    [ACTIONS.DELETE]: ROLES.TRADER.level,   // Traders can cancel orders
    [ACTIONS.EXECUTE]: ROLES.TRADER.level   // Traders can execute trades
  },
  
  [RESOURCES.STRATEGIES]: {
    [ACTIONS.READ]: ROLES.USER.level,       // Users can view strategies
    [ACTIONS.CREATE]: ROLES.TRADER.level,   // Traders can create strategies
    [ACTIONS.UPDATE]: ROLES.TRADER.level,   // Traders can update strategies
    [ACTIONS.DELETE]: ROLES.MANAGER.level,  // Managers can delete strategies
    [ACTIONS.EXECUTE]: ROLES.TRADER.level,  // Traders can run strategies
    [ACTIONS.APPROVE]: ROLES.ANALYST.level, // Analysts can approve strategies
    [ACTIONS.DEPLOY]: ROLES.MANAGER.level   // Managers can deploy strategies
  },
  
  [RESOURCES.ML_MODELS]: {
    [ACTIONS.READ]: ROLES.USER.level,       // Users can view models
    [ACTIONS.CREATE]: ROLES.ANALYST.level,  // Analysts can create models
    [ACTIONS.UPDATE]: ROLES.ANALYST.level,  // Analysts can update models
    [ACTIONS.DELETE]: ROLES.MANAGER.level,  // Managers can delete models
    [ACTIONS.EXECUTE]: ROLES.TRADER.level,  // Traders can use models
    [ACTIONS.APPROVE]: ROLES.ANALYST.level, // Analysts approve models
    [ACTIONS.DEPLOY]: ROLES.MANAGER.level   // Managers deploy models
  },
  
  [RESOURCES.PORTFOLIO]: {
    [ACTIONS.READ]: ROLES.USER.level,       // Users can view own portfolio
    [ACTIONS.UPDATE]: ROLES.TRADER.level,   // Traders can manage portfolio
    [ACTIONS.MANAGE]: ROLES.MANAGER.level   // Managers can manage all portfolios
  },
  
  [RESOURCES.ANALYTICS]: {
    [ACTIONS.READ]: ROLES.USER.level,       // Users can view analytics
    [ACTIONS.CREATE]: ROLES.ANALYST.level,  // Analysts can create reports
    [ACTIONS.EXECUTE]: ROLES.ANALYST.level  // Analysts can run analytics
  },
  
  [RESOURCES.BACKTEST]: {
    [ACTIONS.READ]: ROLES.USER.level,       // Users can view backtest results
    [ACTIONS.CREATE]: ROLES.TRADER.level,   // Traders can create backtests
    [ACTIONS.EXECUTE]: ROLES.TRADER.level   // Traders can run backtests
  },
  
  [RESOURCES.SETTINGS]: {
    [ACTIONS.READ]: ROLES.USER.level,       // Users can view own settings
    [ACTIONS.UPDATE]: ROLES.USER.level,     // Users can update own settings
    [ACTIONS.MANAGE]: ROLES.ADMIN.level     // Admins manage system settings
  },
  
  [RESOURCES.LOGS]: {
    [ACTIONS.READ]: ROLES.ANALYST.level,    // Analysts can view logs
    [ACTIONS.MANAGE]: ROLES.ADMIN.level     // Admins manage logs
  },
  
  [RESOURCES.ADMIN]: {
    [ACTIONS.READ]: ROLES.ADMIN.level,      // Admins can view admin panel
    [ACTIONS.MANAGE]: ROLES.ADMIN.level     // Admins can manage system
  }
};

// Special permissions (override matrix)
const SPECIAL_PERMISSIONS = {
  // Users can always read/update their own resources
  OWN_RESOURCE: {
    [ACTIONS.READ]: ROLES.USER.level,
    [ACTIONS.UPDATE]: ROLES.USER.level
  },
  
  // Superadmin bypasses all checks
  SUPERADMIN_BYPASS: ROLES.SUPERADMIN.level
};

class RBACSystem {
  constructor() {
    this.roles = ROLES;
    this.resources = RESOURCES;
    this.actions = ACTIONS;
    this.matrix = PERMISSION_MATRIX;
    this.auditLog = [];
  }

  /**
   * Check if user has permission for action on resource
   */
  hasPermission(user, resource, action, resourceOwnerId = null) {
    try {
      // Superadmin bypass
      if (user.role === ROLES.SUPERADMIN.id) {
        this.logAccess(user, resource, action, true, 'SUPERADMIN_BYPASS');
        return true;
      }

      // Check if user owns the resource
      if (resourceOwnerId && resourceOwnerId === user.id) {
        const ownPermission = SPECIAL_PERMISSIONS.OWN_RESOURCE[action];
        if (ownPermission && this.getRoleLevel(user.role) >= ownPermission) {
          this.logAccess(user, resource, action, true, 'OWN_RESOURCE');
          return true;
        }
      }

      // Check permission matrix
      const resourcePermissions = this.matrix[resource];
      if (!resourcePermissions) {
        this.logAccess(user, resource, action, false, 'RESOURCE_NOT_FOUND');
        return false;
      }

      const requiredLevel = resourcePermissions[action];
      if (requiredLevel === undefined) {
        this.logAccess(user, resource, action, false, 'ACTION_NOT_DEFINED');
        return false;
      }

      const userLevel = this.getRoleLevel(user.role);
      const hasAccess = userLevel >= requiredLevel;

      this.logAccess(user, resource, action, hasAccess, hasAccess ? 'GRANTED' : 'DENIED');
      return hasAccess;

    } catch (error) {
      logger.error('RBAC permission check error', { user: user.id, resource, action, error: error.message });
      this.logAccess(user, resource, action, false, 'ERROR');
      return false;
    }
  }

  /**
   * Get role level by role ID
   */
  getRoleLevel(roleId) {
    const role = Object.values(ROLES).find(r => r.id === roleId);
    return role ? role.level : 0;
  }

  /**
   * Get role object by ID
   */
  getRole(roleId) {
    return Object.values(ROLES).find(r => r.id === roleId);
  }

  /**
   * Check if role A can manage role B
   */
  canManageRole(managerRole, targetRole) {
    const managerLevel = this.getRoleLevel(managerRole);
    const targetLevel = this.getRoleLevel(targetRole);
    
    // Can only manage roles of lower level
    return managerLevel > targetLevel;
  }

  /**
   * Get all permissions for a role
   */
  getRolePermissions(roleId) {
    const roleLevel = this.getRoleLevel(roleId);
    const permissions = {};

    for (const [resource, actions] of Object.entries(this.matrix)) {
      permissions[resource] = {};
      
      for (const [action, requiredLevel] of Object.entries(actions)) {
        permissions[resource][action] = roleLevel >= requiredLevel;
      }
    }

    return permissions;
  }

  /**
   * Log access attempt
   */
  logAccess(user, resource, action, granted, reason) {
    const entry = {
      timestamp: new Date().toISOString(),
      userId: user.id,
      username: user.username || user.email,
      role: user.role,
      resource,
      action,
      granted,
      reason
    };

    this.auditLog.push(entry);

    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }

    logger.info('RBAC Access', entry);
  }

  /**
   * Get audit log
   */
  getAuditLog(filters = {}) {
    let log = [...this.auditLog];

    if (filters.userId) {
      log = log.filter(entry => entry.userId === filters.userId);
    }

    if (filters.resource) {
      log = log.filter(entry => entry.resource === filters.resource);
    }

    if (filters.granted !== undefined) {
      log = log.filter(entry => entry.granted === filters.granted);
    }

    if (filters.startDate) {
      log = log.filter(entry => new Date(entry.timestamp) >= new Date(filters.startDate));
    }

    if (filters.endDate) {
      log = log.filter(entry => new Date(entry.timestamp) <= new Date(filters.endDate));
    }

    return log;
  }

  /**
   * Generate permission report
   */
  generatePermissionReport() {
    const report = {
      roles: {},
      matrix: this.matrix,
      statistics: {
        totalRoles: Object.keys(ROLES).length,
        totalResources: Object.keys(this.matrix).length,
        totalPermissions: 0
      }
    };

    for (const [roleKey, role] of Object.entries(ROLES)) {
      report.roles[roleKey] = {
        ...role,
        permissions: this.getRolePermissions(role.id),
        permissionCount: 0
      };

      // Count granted permissions
      for (const resource of Object.values(report.roles[roleKey].permissions)) {
        for (const granted of Object.values(resource)) {
          if (granted) {
            report.roles[roleKey].permissionCount++;
            report.statistics.totalPermissions++;
          }
        }
      }
    }

    return report;
  }

  /**
   * Validate permission matrix consistency
   */
  validateMatrix() {
    const errors = [];
    const warnings = [];

    // Check all resources have permissions defined
    for (const resource of Object.values(RESOURCES)) {
      if (!this.matrix[resource]) {
        errors.push(`Resource ${resource} has no permissions defined`);
      }
    }

    // Check role level consistency
    for (const [resource, actions] of Object.entries(this.matrix)) {
      for (const [action, level] of Object.entries(actions)) {
        if (typeof level !== 'number') {
          errors.push(`Invalid level type for ${resource}.${action}: ${typeof level}`);
        }
        
        if (level < 0 || level > 100) {
          warnings.push(`Unusual level for ${resource}.${action}: ${level}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export singleton instance
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new RBACSystem();
  }
  return instance;
}

module.exports = {
  getInstance,
  ROLES,
  RESOURCES,
  ACTIONS,
  PERMISSION_MATRIX
};
