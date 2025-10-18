/**
 * Multi-Tenant Middleware
 * 
 * Provides request-level tenant context resolution and access control
 * 
 * Features:
 * - Automatic tenant resolution from headers/subdomain/JWT
 * - Organization-scoped data access
 * - Permission checking
 * - Resource quota enforcement
 * 
 * @module middleware/multiTenant
 */

const multiTenantService = require('../services/multiTenantService');
const logger = require('../utils/logger');

/**
 * Resolve tenant context from request
 * 
 * Checks (in order):
 * 1. X-Organization-ID header
 * 2. Subdomain (for white-label)
 * 3. JWT claims
 * 4. User's default organization
 */
async function resolveTenantContext(req, res, next) {
  try {
    let organizationId = null;

    // 1. Check X-Organization-ID header
    if (req.headers['x-organization-id']) {
      organizationId = parseInt(req.headers['x-organization-id']);
    }

    // 2. Check subdomain (for white-label deployments)
    if (!organizationId && req.headers.host) {
      const subdomain = extractSubdomain(req.headers.host);
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        const org = await findOrganizationBySubdomain(subdomain);
        if (org) {
          organizationId = org.id;
        }
      }
    }

    // 3. Check custom domain
    if (!organizationId && req.headers.host) {
      const org = await findOrganizationByDomain(req.headers.host);
      if (org) {
        organizationId = org.id;
      }
    }

    // 4. Check JWT claims
    if (!organizationId && req.user && req.user.organization_id) {
      organizationId = req.user.organization_id;
    }

    // 5. Use user's default organization
    if (!organizationId && req.user && req.user.default_organization_id) {
      organizationId = req.user.default_organization_id;
    }

    // Attach to request
    req.organizationId = organizationId;
    req.organization = organizationId ? await multiTenantService.getOrganization(organizationId) : null;

    // Verify user is member of organization
    if (organizationId && req.user) {
      const members = await multiTenantService.getMembers(organizationId);
      const member = members.find(m => m.user_id === req.user.id);
      
      if (!member) {
        return res.status(403).json({
          success: false,
          error: 'User is not a member of this organization'
        });
      }

      req.organizationMember = member;
      req.userRole = member.role;
    }

    next();
  } catch (error) {
    logger.error('Error resolving tenant context', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to resolve tenant context'
    });
  }
}

/**
 * Require tenant context (must be set)
 */
function requireTenant(req, res, next) {
  if (!req.organizationId) {
    return res.status(400).json({
      success: false,
      error: 'Organization context required. Provide X-Organization-ID header.'
    });
  }

  if (!req.organization) {
    return res.status(404).json({
      success: false,
      error: 'Organization not found'
    });
  }

  // Check organization status
  if (req.organization.status === 'suspended') {
    return res.status(403).json({
      success: false,
      error: 'Organization is suspended'
    });
  }

  if (req.organization.status === 'cancelled') {
    return res.status(403).json({
      success: false,
      error: 'Organization has been cancelled'
    });
  }

  // Check trial/subscription expiration
  if (req.organization.status === 'trial' && req.organization.trial_ends_at) {
    if (new Date(req.organization.trial_ends_at) < new Date()) {
      return res.status(403).json({
        success: false,
        error: 'Trial period has expired'
      });
    }
  }

  if (req.organization.subscription_ends_at) {
    if (new Date(req.organization.subscription_ends_at) < new Date()) {
      return res.status(403).json({
        success: false,
        error: 'Subscription has expired'
      });
    }
  }

  next();
}

/**
 * Check permission for action
 */
function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.organizationId || !req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const hasPermission = await multiTenantService.hasPermission(
      req.organizationId,
      req.user.id,
      permission
    );

    if (!hasPermission) {
      logger.warn('Permission denied', {
        organizationId: req.organizationId,
        userId: req.user.id,
        permission
      });

      return res.status(403).json({
        success: false,
        error: `Permission denied: ${permission}`
      });
    }

    next();
  };
}

/**
 * Check resource quota
 */
function checkQuota(resourceType) {
  return async (req, res, next) => {
    if (!req.organizationId) {
      return next(); // Skip if no tenant context
    }

    try {
      const quota = await multiTenantService.checkQuota(req.organizationId, resourceType);

      if (!quota.allowed) {
        logger.warn('Quota exceeded', {
          organizationId: req.organizationId,
          resourceType,
          used: quota.used,
          limit: quota.limit
        });

        return res.status(429).json({
          success: false,
          error: `Quota exceeded for ${resourceType}`,
          quota: {
            used: quota.used,
            limit: quota.limit,
            remaining: quota.remaining
          }
        });
      }

      // Attach quota info to request
      req.quota = quota;

      next();
    } catch (error) {
      logger.error('Error checking quota', { error: error.message });
      next(); // Continue on error
    }
  };
}

/**
 * Track resource usage
 */
function trackUsage(resourceType, getQuantity = () => 1, getMetadata = null) {
  return async (req, res, next) => {
    if (!req.organizationId) {
      return next();
    }

    // Wrap res.json to track after response
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      // Track usage async (don't block response)
      setImmediate(async () => {
        try {
          const quantity = typeof getQuantity === 'function' ? getQuantity(req, data) : 1;
          const metadata = getMetadata ? getMetadata(req, data) : null;

          await multiTenantService.incrementQuotaUsage(
            req.organizationId,
            resourceType,
            quantity,
            metadata
          );
        } catch (error) {
          logger.error('Error tracking usage', { error: error.message });
        }
      });

      return originalJson(data);
    };

    next();
  };
}

/**
 * Scope query to organization (for database queries)
 */
function scopeToOrganization(queryBuilder, req) {
  if (req.organizationId) {
    return queryBuilder.where('organization_id', req.organizationId);
  }
  return queryBuilder;
}

/**
 * Helper: Extract subdomain from host
 */
function extractSubdomain(host) {
  // Remove port if present
  const hostname = host.split(':')[0];
  const parts = hostname.split('.');
  
  // Need at least 3 parts for subdomain (subdomain.domain.tld)
  if (parts.length < 3) {
    return null;
  }

  return parts[0];
}

/**
 * Helper: Find organization by subdomain
 */
async function findOrganizationBySubdomain(subdomain) {
  const db = require('../config/database');
  
  const org = await db('organizations')
    .where('slug', subdomain)
    .whereNull('deleted_at')
    .where('status', '!=', 'cancelled')
    .first();

  return org;
}

/**
 * Helper: Find organization by custom domain
 */
async function findOrganizationByDomain(domain) {
  const db = require('../config/database');
  
  // Remove port if present
  const hostname = domain.split(':')[0];
  
  const org = await db('organizations')
    .where('domain', hostname)
    .whereNull('deleted_at')
    .where('status', '!=', 'cancelled')
    .first();

  return org;
}

/**
 * Middleware to check if user is organization owner
 */
function requireOwner(req, res, next) {
  if (!req.organizationMember || req.organizationMember.role !== 'owner') {
    return res.status(403).json({
      success: false,
      error: 'Organization owner access required'
    });
  }
  next();
}

/**
 * Middleware to check if user is admin or owner
 */
function requireAdmin(req, res, next) {
  if (!req.organizationMember || 
      !['owner', 'admin'].includes(req.organizationMember.role)) {
    return res.status(403).json({
      success: false,
      error: 'Organization admin access required'
    });
  }
  next();
}

/**
 * Attach tenant context to logs
 */
function attachTenantContext(req, res, next) {
  if (req.organizationId) {
    // Attach to logger context (if supported)
    req.logContext = {
      ...req.logContext,
      organizationId: req.organizationId,
      organizationName: req.organization?.name,
      userRole: req.userRole
    };
  }
  next();
}

module.exports = {
  resolveTenantContext,
  requireTenant,
  requirePermission,
  requireOwner,
  requireAdmin,
  checkQuota,
  trackUsage,
  scopeToOrganization,
  attachTenantContext
};
