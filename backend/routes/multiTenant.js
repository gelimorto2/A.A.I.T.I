/**
 * Multi-Tenant API Routes
 * 
 * Provides REST API endpoints for organization management:
 * - Organization CRUD
 * - Member management
 * - Configuration management
 * - Quota tracking
 * - Invitation system
 * 
 * @module routes/multiTenant
 */

const express = require('express');
const router = express.Router();
const multiTenantService = require('../services/multiTenantService');
const { authenticateToken } = require('../middleware/auth');
const {
  resolveTenantContext,
  requireTenant,
  requirePermission,
  requireOwner,
  requireAdmin,
  checkQuota,
  trackUsage
} = require('../middleware/multiTenant');
const logger = require('../utils/logger');

// Apply authentication and tenant context to all routes
router.use(authenticateToken);
router.use(resolveTenantContext);

/**
 * @route POST /api/organizations
 * @desc Create a new organization
 * @access Authenticated
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, industry, plan = 'free' } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Organization name is required'
      });
    }

    const organization = await multiTenantService.createOrganization(
      { name, description, industry, plan },
      req.user.id
    );

    res.status(201).json({
      success: true,
      data: organization
    });
  } catch (error) {
    logger.error('Error creating organization', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/organizations
 * @desc Get user's organizations
 * @access Authenticated
 */
router.get('/', async (req, res) => {
  try {
    const organizations = await multiTenantService.getUserOrganizations(req.user.id);

    res.json({
      success: true,
      data: organizations,
      count: organizations.length
    });
  } catch (error) {
    logger.error('Error fetching organizations', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/organizations/:id
 * @desc Get organization details
 * @access Organization Member
 */
router.get('/:id', requireTenant, async (req, res) => {
  try {
    const organizationId = parseInt(req.params.id);

    // Verify user is member
    if (organizationId !== req.organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const organization = await multiTenantService.getOrganization(organizationId);

    res.json({
      success: true,
      data: organization
    });
  } catch (error) {
    logger.error('Error fetching organization', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route PUT /api/organizations/:id
 * @desc Update organization
 * @access Organization Admin
 */
router.put('/:id', requireTenant, requireAdmin, async (req, res) => {
  try {
    const organizationId = parseInt(req.params.id);
    const { name, description, industry, domain } = req.body;

    const updatedData = {};
    if (name) updatedData.name = name;
    if (description !== undefined) updatedData.description = description;
    if (industry) updatedData.industry = industry;
    if (domain !== undefined) updatedData.domain = domain;

    const organization = await multiTenantService.updateOrganization(
      organizationId,
      updatedData,
      req.user.id
    );

    res.json({
      success: true,
      data: organization
    });
  } catch (error) {
    logger.error('Error updating organization', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/organizations/:id
 * @desc Delete organization
 * @access Organization Owner
 */
router.delete('/:id', requireTenant, requireOwner, async (req, res) => {
  try {
    const organizationId = parseInt(req.params.id);

    await multiTenantService.deleteOrganization(organizationId, req.user.id);

    res.json({
      success: true,
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting organization', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/organizations/:id/members
 * @desc Get organization members
 * @access Organization Member
 */
router.get('/:id/members', requireTenant, async (req, res) => {
  try {
    const organizationId = parseInt(req.params.id);

    const members = await multiTenantService.getMembers(organizationId);

    res.json({
      success: true,
      data: members,
      count: members.length
    });
  } catch (error) {
    logger.error('Error fetching members', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/organizations/:id/members
 * @desc Add member to organization
 * @access Organization Admin
 */
router.post('/:id/members', requireTenant, requireAdmin, async (req, res) => {
  try {
    const organizationId = parseInt(req.params.id);
    const { user_id, role = 'viewer' } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required'
      });
    }

    const member = await multiTenantService.addMember(
      organizationId,
      user_id,
      role,
      req.user.email
    );

    res.status(201).json({
      success: true,
      data: member
    });
  } catch (error) {
    logger.error('Error adding member', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/organizations/:id/members/:userId
 * @desc Remove member from organization
 * @access Organization Admin
 */
router.delete('/:id/members/:userId', requireTenant, requireAdmin, async (req, res) => {
  try {
    const organizationId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);

    await multiTenantService.removeMember(organizationId, userId, req.user.id);

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    logger.error('Error removing member', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route PUT /api/organizations/:id/members/:userId/role
 * @desc Update member role
 * @access Organization Admin
 */
router.put('/:id/members/:userId/role', requireTenant, requireAdmin, async (req, res) => {
  try {
    const organizationId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'role is required'
      });
    }

    await multiTenantService.updateMemberRole(
      organizationId,
      userId,
      role,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Member role updated successfully'
    });
  } catch (error) {
    logger.error('Error updating member role', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/organizations/:id/config
 * @desc Get organization configuration
 * @access Organization Member
 */
router.get('/:id/config', requireTenant, async (req, res) => {
  try {
    const organizationId = parseInt(req.params.id);
    const { keys } = req.query;

    if (keys) {
      // Get specific keys
      const keyArray = keys.split(',');
      const config = {};

      for (const key of keyArray) {
        config[key] = await multiTenantService.getConfig(organizationId, key);
      }

      return res.json({
        success: true,
        data: config
      });
    }

    // Get all public configs
    const db = require('../config/database');
    const configs = await db('tenant_configurations')
      .where({ organization_id: organizationId, is_public: true })
      .select('config_key', 'config_value', 'config_type');

    const configObj = {};
    configs.forEach(c => {
      let value = c.config_value;
      if (c.config_type === 'number') value = parseFloat(value);
      if (c.config_type === 'boolean') value = value === 'true';
      if (c.config_type === 'json') value = JSON.parse(value);
      configObj[c.config_key] = value;
    });

    res.json({
      success: true,
      data: configObj
    });
  } catch (error) {
    logger.error('Error fetching config', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route PUT /api/organizations/:id/config
 * @desc Update organization configuration
 * @access Organization Admin
 */
router.put('/:id/config', requireTenant, requireAdmin, async (req, res) => {
  try {
    const organizationId = parseInt(req.params.id);
    const { configs } = req.body;

    if (!configs || typeof configs !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'configs object is required'
      });
    }

    // Update each config
    for (const [key, value] of Object.entries(configs)) {
      let type = 'string';
      if (typeof value === 'number') type = 'number';
      if (typeof value === 'boolean') type = 'boolean';
      if (typeof value === 'object') type = 'json';

      await multiTenantService.setConfig(organizationId, key, value, type);
    }

    res.json({
      success: true,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    logger.error('Error updating config', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/organizations/:id/quotas
 * @desc Get resource quotas
 * @access Organization Admin
 */
router.get('/:id/quotas', requireTenant, requireAdmin, async (req, res) => {
  try {
    const organizationId = parseInt(req.params.id);

    const db = require('../config/database');
    const quotas = await db('resource_quotas')
      .where({ organization_id: organizationId })
      .where('period_end', '>', new Date())
      .select('*');

    res.json({
      success: true,
      data: quotas
    });
  } catch (error) {
    logger.error('Error fetching quotas', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/organizations/:id/usage
 * @desc Get resource usage statistics
 * @access Organization Admin
 */
router.get('/:id/usage', requireTenant, requireAdmin, async (req, res) => {
  try {
    const organizationId = parseInt(req.params.id);
    const { resource_type, start_date, end_date } = req.query;

    const db = require('../config/database');
    let query = db('resource_usage_logs')
      .where({ organization_id: organizationId });

    if (resource_type) {
      query = query.where({ resource_type });
    }

    if (start_date) {
      query = query.where('created_at', '>=', start_date);
    }

    if (end_date) {
      query = query.where('created_at', '<=', end_date);
    }

    const usage = await query
      .select(
        'resource_type',
        db.raw('SUM(quantity) as total_quantity'),
        db.raw('COUNT(*) as total_requests'),
        db.raw('DATE(created_at) as date')
      )
      .groupBy('resource_type', 'date')
      .orderBy('date', 'desc')
      .limit(100);

    res.json({
      success: true,
      data: usage
    });
  } catch (error) {
    logger.error('Error fetching usage', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/organizations/:id/activity
 * @desc Get organization activity logs
 * @access Organization Admin
 */
router.get('/:id/activity', requireTenant, requireAdmin, async (req, res) => {
  try {
    const organizationId = parseInt(req.params.id);
    const { limit = 50, offset = 0 } = req.query;

    const db = require('../config/database');
    const logs = await db('organization_activity_logs as oal')
      .leftJoin('users as u', 'oal.user_id', 'u.id')
      .where('oal.organization_id', organizationId)
      .select(
        'oal.*',
        'u.email as user_email',
        'u.username as user_username'
      )
      .orderBy('oal.created_at', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    const totalCount = await db('organization_activity_logs')
      .where({ organization_id: organizationId })
      .count('* as count')
      .first();

    res.json({
      success: true,
      data: logs,
      pagination: {
        total: parseInt(totalCount.count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Error fetching activity logs', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/organizations/:id/permissions
 * @desc Check user permissions
 * @access Organization Member
 */
router.get('/:id/permissions', requireTenant, async (req, res) => {
  try {
    const organizationId = parseInt(req.params.id);
    const { permission } = req.query;

    if (permission) {
      // Check specific permission
      const hasPermission = await multiTenantService.hasPermission(
        organizationId,
        req.user.id,
        permission
      );

      return res.json({
        success: true,
        data: {
          permission,
          allowed: hasPermission
        }
      });
    }

    // Return user's role and permissions
    res.json({
      success: true,
      data: {
        role: req.userRole,
        permissions: multiTenantService.rolePermissions[req.userRole] || []
      }
    });
  } catch (error) {
    logger.error('Error checking permissions', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
