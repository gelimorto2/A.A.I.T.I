/**
 * Sprint 4: Role-Based Access Control (RBAC) Middleware
 * Comprehensive permission management and route protection system
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class RBACMiddleware {
  constructor() {
    this.permissionsConfig = null;
    this.loadPermissions();
    this.setupHMACValidation();
  }

  /**
   * Load permissions configuration from JSON file
   */
  loadPermissions() {
    try {
      const permissionsPath = path.join(__dirname, '../config/permissions.json');
      const configData = fs.readFileSync(permissionsPath, 'utf8');
      this.permissionsConfig = JSON.parse(configData);
      console.log('✅ RBAC permissions configuration loaded');
    } catch (error) {
      console.error('❌ Failed to load permissions configuration:', error);
      throw new Error('RBAC configuration not available');
    }
  }

  /**
   * Setup HMAC validation for trade-critical endpoints
   */
  setupHMACValidation() {
    this.tradeCriticalEndpoints = [
      '/api/trading/orders',
      '/api/ml-strategy/strategies/:id/deploy',
      '/api/risk/override'
    ];
    
    this.hmacSecret = process.env.HMAC_SECRET || crypto.randomBytes(32).toString('hex');
    if (!process.env.HMAC_SECRET) {
      console.warn('⚠️  HMAC_SECRET not set in environment, using random secret');
    }
  }

  /**
   * Main RBAC middleware function
   */
  authorize(requiredPermission, options = {}) {
    return async (req, res, next) => {
      try {
        // Extract user information
        const user = req.user;
        const apiKey = req.apiKey;
        
        if (!user && !apiKey) {
          return res.status(401).json({
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
        }

        // Determine user role and permissions
        const userRole = user?.role || 'viewer';
        const userPermissions = this.getUserPermissions(userRole, apiKey);
        
        // Check if this is a trade-critical endpoint requiring HMAC
        if (this.isTradeCriticalEndpoint(req) && options.requireHMAC !== false) {
          const hmacValid = this.validateHMAC(req);
          if (!hmacValid) {
            return res.status(403).json({
              error: 'HMAC signature required for trade-critical operations',
              code: 'HMAC_REQUIRED'
            });
          }
        }

        // Check permission
        const hasPermission = this.checkPermission(userPermissions, requiredPermission, user, req);
        
        if (!hasPermission) {
          // Log unauthorized access attempt
          this.logUnauthorizedAccess(req, user, requiredPermission);
          
          return res.status(403).json({
            error: `Insufficient permissions. Required: ${requiredPermission}`,
            code: 'INSUFFICIENT_PERMISSIONS',
            user_role: userRole,
            required_permission: requiredPermission
          });
        }

        // Check rate limiting
        const rateLimitResult = await this.checkRateLimit(user, apiKey);
        if (!rateLimitResult.allowed) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            retry_after: rateLimitResult.retryAfter
          });
        }

        // Log successful authorization
        this.logAuthorizedAccess(req, user, requiredPermission);
        
        // Add permission context to request
        req.permissions = {
          user_role: userRole,
          all_permissions: userPermissions,
          current_permission: requiredPermission
        };

        next();

      } catch (error) {
        console.error('❌ RBAC authorization error:', error);
        res.status(500).json({
          error: 'Authorization system error',
          code: 'RBAC_ERROR'
        });
      }
    };
  }

  /**
   * Get user permissions based on role and API key scopes
   */
  getUserPermissions(userRole, apiKey = null) {
    const rolePermissions = this.permissionsConfig.roles[userRole]?.permissions || [];
    
    if (apiKey && apiKey.scopes) {
      // Intersection of role permissions and API key scopes
      return rolePermissions.filter(permission => apiKey.scopes.includes(permission));
    }
    
    return rolePermissions;
  }

  /**
   * Check if user has required permission
   */
  checkPermission(userPermissions, requiredPermission, user, req) {
    // Direct permission check
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check permission inheritance
    const inheritedPermissions = this.getInheritedPermissions(userPermissions);
    if (inheritedPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check special conditions (own resource access)
    if (this.checkOwnResourceAccess(requiredPermission, user, req)) {
      return true;
    }

    return false;
  }

  /**
   * Get inherited permissions based on permission hierarchy
   */
  getInheritedPermissions(userPermissions) {
    const inherited = [];
    const inheritance = this.permissionsConfig.permission_inheritance;
    
    for (const permission of userPermissions) {
      if (inheritance[permission]) {
        inherited.push(...inheritance[permission]);
      }
    }
    
    return [...userPermissions, ...inherited];
  }

  /**
   * Check if user can access their own resources
   */
  checkOwnResourceAccess(requiredPermission, user, req) {
    const ownResourceConditions = this.permissionsConfig.special_conditions.own_resource_access;
    const currentRoute = `${req.method} ${req.route?.path || req.path}`;
    
    // Check if this route allows own resource access
    const allowsOwnAccess = ownResourceConditions.routes.some(route => {
      const routePattern = route.replace(/:\w+/g, '[^/]+');
      const regex = new RegExp(`^${routePattern}$`);
      return regex.test(currentRoute);
    });

    if (!allowsOwnAccess) return false;

    // Check if accessing own resource (simplified - would need more context in real implementation)
    const resourceUserId = req.params.userId || req.query.userId || req.body.userId;
    return resourceUserId === user?.id;
  }

  /**
   * Validate HMAC signature for trade-critical endpoints
   */
  validateHMAC(req) {
    const providedSignature = req.headers['x-hmac-signature'];
    const timestamp = req.headers['x-timestamp'];
    const nonce = req.headers['x-nonce'];

    if (!providedSignature || !timestamp || !nonce) {
      return false;
    }

    // Check timestamp (must be within 5 minutes)
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
      return false;
    }

    // Check nonce uniqueness (simplified - would need Redis in production)
    if (this.usedNonces?.has(nonce)) {
      return false;
    }

    // Calculate expected signature
    const payload = `${req.method}${req.originalUrl}${JSON.stringify(req.body)}${timestamp}${nonce}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.hmacSecret)
      .update(payload)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(providedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (isValid) {
      // Store nonce to prevent replay (in production, use Redis with TTL)
      if (!this.usedNonces) this.usedNonces = new Set();
      this.usedNonces.add(nonce);
    }

    return isValid;
  }

  /**
   * Check if endpoint is trade-critical
   */
  isTradeCriticalEndpoint(req) {
    const currentPath = req.route?.path || req.path;
    return this.tradeCriticalEndpoints.some(endpoint => {
      const pattern = endpoint.replace(/:\w+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(currentPath);
    });
  }

  /**
   * Rate limiting check
   */
  async checkRateLimit(user, apiKey) {
    // Simple in-memory rate limiting (use Redis in production)
    if (!this.rateLimitStore) this.rateLimitStore = new Map();
    
    const userRole = user?.role || 'api_user';
    const limits = this.permissionsConfig.security_policies.rate_limiting?.limits || {};
    const userLimit = limits[userRole] || '100/hour';
    
    const [limit, period] = userLimit.split('/');
    const limitCount = parseInt(limit);
    const userId = user?.id || apiKey?.id || 'anonymous';
    
    const now = Date.now();
    const windowStart = period === 'hour' ? now - 3600000 : now - 60000;
    
    // Get user's request history
    const userRequests = this.rateLimitStore.get(userId) || [];
    const recentRequests = userRequests.filter(time => time > windowStart);
    
    if (recentRequests.length >= limitCount) {
      return {
        allowed: false,
        retryAfter: Math.ceil((recentRequests[0] + (period === 'hour' ? 3600000 : 60000) - now) / 1000)
      };
    }

    // Add current request
    recentRequests.push(now);
    this.rateLimitStore.set(userId, recentRequests);
    
    return { allowed: true };
  }

  /**
   * Log unauthorized access attempts
   */
  logUnauthorizedAccess(req, user, requiredPermission) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: 'unauthorized_access',
      user_id: user?.id || 'anonymous',
      user_role: user?.role || 'unknown',
      ip_address: req.ip,
      method: req.method,
      path: req.path,
      required_permission: requiredPermission,
      user_agent: req.get('User-Agent')
    };

    console.log('🚨 Unauthorized access attempt:', JSON.stringify(logEntry));
    
    // In production, send to security monitoring system
    // this.securityMonitor.logSecurityEvent(logEntry);
  }

  /**
   * Log successful authorization
   */
  logAuthorizedAccess(req, user, requiredPermission) {
    if (process.env.LOG_LEVEL === 'debug') {
      const logEntry = {
        timestamp: new Date().toISOString(),
        event: 'authorized_access',
        user_id: user?.id || 'api_key',
        user_role: user?.role || 'api_user',
        method: req.method,
        path: req.path,
        permission: requiredPermission
      };

      console.log('✅ Authorized access:', JSON.stringify(logEntry));
    }
  }

  /**
   * Generate HMAC signature for client use
   */
  generateHMAC(method, url, body, timestamp, nonce) {
    const payload = `${method}${url}${JSON.stringify(body)}${timestamp}${nonce}`;
    return crypto
      .createHmac('sha256', this.hmacSecret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Validate route permissions against configuration
   */
  validateRoutePermissions(app) {
    const routePermissions = this.permissionsConfig.route_permissions;
    const definedRoutes = new Set();
    
    // Extract all defined routes from Express app
    app._router.stack.forEach(layer => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods);
        methods.forEach(method => {
          const route = `${method.toUpperCase()} ${layer.route.path}`;
          definedRoutes.add(route);
        });
      }
    });

    // Check for routes without permission definitions
    const unprotectedRoutes = [];
    definedRoutes.forEach(route => {
      if (!routePermissions[route] && !route.includes('/health') && !route.includes('/ready')) {
        unprotectedRoutes.push(route);
      }
    });

    if (unprotectedRoutes.length > 0) {
      console.warn('⚠️  Routes without permission definitions:', unprotectedRoutes);
    }

    console.log(`✅ Route permission validation complete. ${definedRoutes.size} routes checked`);
  }

  /**
   * Middleware to require specific role
   */
  requireRole(requiredRole) {
    return (req, res, next) => {
      const userRole = req.user?.role;
      
      if (!userRole || userRole !== requiredRole) {
        return res.status(403).json({
          error: `Access denied. Required role: ${requiredRole}`,
          code: 'ROLE_REQUIRED',
          user_role: userRole
        });
      }
      
      next();
    };
  }

  /**
   * Middleware to require MFA for sensitive operations
   */
  requireMFA() {
    return (req, res, next) => {
      const user = req.user;
      const userRole = user?.role || 'viewer';
      const mfaRequired = this.permissionsConfig.security_policies.mfa_required[userRole];
      
      if (mfaRequired && !user?.mfa_verified) {
        return res.status(403).json({
          error: 'Multi-factor authentication required',
          code: 'MFA_REQUIRED'
        });
      }
      
      next();
    };
  }

  /**
   * Check if user has a specific role
   */
  hasRole(user, role) {
    if (!user) return false;
    
    // Handle array of roles (preferred format)
    if (Array.isArray(user.roles)) {
      return user.roles.includes(role);
    }
    
    // Handle single role for backward compatibility
    if (user.role) {
      return user.role === role;
    }
    
    return false;
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(user, permission, resource = null) {
    if (!user) return false;
    
    const userRole = user.role || 'viewer';
    const userPermissions = this.getUserPermissions(userRole);
    
    return userPermissions.includes(permission);
  }

  /**
   * Check if user has a specific role (alias for hasRole)
   */
  checkRole(user, role) {
    return this.hasRole(user, role);
  }

  /**
   * Check if user has a specific permission (alias for hasPermission)
   */
  checkPermission(user, permission, resource = null) {
    return this.hasPermission(user, permission, resource);
  }
}

module.exports = RBACMiddleware;