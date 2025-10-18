/**
 * Multi-Tenant Service
 * 
 * Core service for managing multi-tenant functionality including:
 * - Organization lifecycle management
 * - Tenant configuration
 * - Member management
 * - Resource quotas and tracking
 * - Access control
 * 
 * @module services/multiTenantService
 */

const crypto = require('crypto');
const logger = require('../utils/logger');
const db = require('../config/database');

class MultiTenantService {
  constructor() {
    this.defaultQuotas = {
      free: {
        api_calls: 1000,
        strategies: 5,
        trades_per_day: 50,
        max_users: 3,
        max_api_keys: 2
      },
      starter: {
        api_calls: 10000,
        strategies: 25,
        trades_per_day: 500,
        max_users: 10,
        max_api_keys: 5
      },
      professional: {
        api_calls: 100000,
        strategies: 100,
        trades_per_day: 5000,
        max_users: 50,
        max_api_keys: 20
      },
      enterprise: {
        api_calls: 1000000,
        strategies: -1, // Unlimited
        trades_per_day: -1, // Unlimited
        max_users: -1, // Unlimited
        max_api_keys: -1 // Unlimited
      }
    };

    this.rolePermissions = {
      owner: ['*'], // All permissions
      admin: [
        'organization:read', 'organization:update',
        'members:invite', 'members:remove', 'members:update',
        'strategies:*', 'trades:*', 'analytics:*',
        'api_keys:*', 'settings:*'
      ],
      trader: [
        'organization:read',
        'strategies:read', 'strategies:create', 'strategies:update',
        'trades:*', 'analytics:read',
        'api_keys:read'
      ],
      analyst: [
        'organization:read',
        'strategies:read', 'analytics:*',
        'trades:read'
      ],
      viewer: [
        'organization:read',
        'strategies:read', 'analytics:read',
        'trades:read'
      ]
    };
  }

  /**
   * Create a new organization
   */
  async createOrganization(data, ownerUserId) {
    const trx = await db.transaction();
    
    try {
      // Generate unique slug
      const slug = await this.generateUniqueSlug(data.name);
      
      // Create organization
      const [organization] = await trx('organizations').insert({
        name: data.name,
        slug: slug,
        domain: data.domain || null,
        status: data.status || 'trial',
        plan: data.plan || 'free',
        owner_user_id: ownerUserId,
        description: data.description || null,
        industry: data.industry || null,
        max_users: this.defaultQuotas[data.plan || 'free'].max_users,
        max_api_keys: this.defaultQuotas[data.plan || 'free'].max_api_keys,
        max_strategies: this.defaultQuotas[data.plan || 'free'].strategies,
        trial_ends_at: data.trial_ends_at || this.getTrialEndDate(),
        subscription_ends_at: data.subscription_ends_at || null
      }).returning('*');

      // Add owner as member
      await trx('organization_members').insert({
        organization_id: organization.id,
        user_id: ownerUserId,
        role: 'owner',
        status: 'active',
        joined_at: new Date()
      });

      // Initialize default quotas
      await this.initializeQuotas(organization.id, organization.plan, trx);

      // Initialize default configurations
      await this.initializeDefaultConfig(organization.id, trx);

      // Log activity
      await this.logActivity({
        organization_id: organization.id,
        user_id: ownerUserId,
        action: 'created',
        resource_type: 'organization',
        resource_id: organization.id,
        changes: { organization }
      }, trx);

      await trx.commit();

      logger.info('Organization created', {
        organizationId: organization.id,
        name: organization.name,
        owner: ownerUserId
      });

      return organization;
    } catch (error) {
      await trx.rollback();
      logger.error('Failed to create organization', { error: error.message });
      throw error;
    }
  }

  /**
   * Get organization by ID
   */
  async getOrganization(organizationId) {
    const organization = await db('organizations')
      .where({ id: organizationId })
      .whereNull('deleted_at')
      .first();

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Get member count
    const memberCount = await db('organization_members')
      .where({ organization_id: organizationId, status: 'active' })
      .count('* as count')
      .first();

    organization.member_count = parseInt(memberCount.count);

    return organization;
  }

  /**
   * Update organization
   */
  async updateOrganization(organizationId, data, userId) {
    const trx = await db.transaction();

    try {
      const beforeUpdate = await trx('organizations')
        .where({ id: organizationId })
        .first();

      await trx('organizations')
        .where({ id: organizationId })
        .update({
          ...data,
          updated_at: new Date()
        });

      const afterUpdate = await trx('organizations')
        .where({ id: organizationId })
        .first();

      // Log activity
      await this.logActivity({
        organization_id: organizationId,
        user_id: userId,
        action: 'updated',
        resource_type: 'organization',
        resource_id: organizationId,
        changes: { before: beforeUpdate, after: afterUpdate }
      }, trx);

      await trx.commit();

      return afterUpdate;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Delete organization (soft delete)
   */
  async deleteOrganization(organizationId, userId) {
    const trx = await db.transaction();

    try {
      await trx('organizations')
        .where({ id: organizationId })
        .update({
          deleted_at: new Date(),
          status: 'cancelled'
        });

      await this.logActivity({
        organization_id: organizationId,
        user_id: userId,
        action: 'deleted',
        resource_type: 'organization',
        resource_id: organizationId
      }, trx);

      await trx.commit();

      logger.info('Organization deleted', { organizationId, userId });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Get user's organizations
   */
  async getUserOrganizations(userId) {
    const organizations = await db('organizations as o')
      .join('organization_members as om', 'o.id', 'om.organization_id')
      .where('om.user_id', userId)
      .where('om.status', 'active')
      .whereNull('o.deleted_at')
      .select(
        'o.*',
        'om.role',
        'om.joined_at',
        'om.last_active_at'
      )
      .orderBy('o.created_at', 'desc');

    return organizations;
  }

  /**
   * Add member to organization
   */
  async addMember(organizationId, userId, role, invitedBy) {
    const trx = await db.transaction();

    try {
      // Check if user is already a member
      const existing = await trx('organization_members')
        .where({ organization_id: organizationId, user_id: userId })
        .first();

      if (existing) {
        throw new Error('User is already a member of this organization');
      }

      // Check quota
      const canAdd = await this.checkMemberQuota(organizationId, trx);
      if (!canAdd) {
        throw new Error('Member quota exceeded');
      }

      const [member] = await trx('organization_members').insert({
        organization_id: organizationId,
        user_id: userId,
        role: role,
        status: 'active',
        joined_at: new Date(),
        invited_by_email: invitedBy
      }).returning('*');

      await this.logActivity({
        organization_id: organizationId,
        user_id: invitedBy,
        action: 'added',
        resource_type: 'member',
        resource_id: member.id,
        changes: { member }
      }, trx);

      await trx.commit();

      return member;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Remove member from organization
   */
  async removeMember(organizationId, userId, removedBy) {
    const trx = await db.transaction();

    try {
      // Cannot remove owner
      const member = await trx('organization_members')
        .where({ organization_id: organizationId, user_id: userId })
        .first();

      if (!member) {
        throw new Error('Member not found');
      }

      if (member.role === 'owner') {
        throw new Error('Cannot remove organization owner');
      }

      await trx('organization_members')
        .where({ organization_id: organizationId, user_id: userId })
        .delete();

      await this.logActivity({
        organization_id: organizationId,
        user_id: removedBy,
        action: 'removed',
        resource_type: 'member',
        resource_id: member.id,
        changes: { member }
      }, trx);

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(organizationId, userId, newRole, updatedBy) {
    const trx = await db.transaction();

    try {
      const member = await trx('organization_members')
        .where({ organization_id: organizationId, user_id: userId })
        .first();

      if (!member) {
        throw new Error('Member not found');
      }

      if (member.role === 'owner') {
        throw new Error('Cannot change owner role');
      }

      const oldRole = member.role;

      await trx('organization_members')
        .where({ organization_id: organizationId, user_id: userId })
        .update({
          role: newRole,
          updated_at: new Date()
        });

      await this.logActivity({
        organization_id: organizationId,
        user_id: updatedBy,
        action: 'role_changed',
        resource_type: 'member',
        resource_id: member.id,
        changes: { from: oldRole, to: newRole }
      }, trx);

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Get organization members
   */
  async getMembers(organizationId) {
    const members = await db('organization_members as om')
      .join('users as u', 'om.user_id', 'u.id')
      .where('om.organization_id', organizationId)
      .where('om.status', 'active')
      .select(
        'om.*',
        'u.email',
        'u.username',
        'u.full_name'
      )
      .orderBy('om.role')
      .orderBy('om.joined_at');

    return members;
  }

  /**
   * Check if user has permission
   */
  async hasPermission(organizationId, userId, permission) {
    const member = await db('organization_members')
      .where({ organization_id: organizationId, user_id: userId, status: 'active' })
      .first();

    if (!member) {
      return false;
    }

    const rolePerms = this.rolePermissions[member.role] || [];
    
    // Owner has all permissions
    if (rolePerms.includes('*')) {
      return true;
    }

    // Check specific permission
    if (rolePerms.includes(permission)) {
      return true;
    }

    // Check wildcard permissions (e.g., 'strategies:*')
    const [resource, action] = permission.split(':');
    if (rolePerms.includes(`${resource}:*`)) {
      return true;
    }

    // Check custom permissions
    if (member.permissions) {
      const customPerms = typeof member.permissions === 'string' 
        ? JSON.parse(member.permissions)
        : member.permissions;
      
      if (customPerms.includes(permission) || customPerms.includes(`${resource}:*`)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get/Set tenant configuration
   */
  async getConfig(organizationId, key, defaultValue = null) {
    const config = await db('tenant_configurations')
      .where({ organization_id: organizationId, config_key: key })
      .first();

    if (!config) {
      return defaultValue;
    }

    // Parse value based on type
    switch (config.config_type) {
      case 'number':
        return parseFloat(config.config_value);
      case 'boolean':
        return config.config_value === 'true';
      case 'json':
        return JSON.parse(config.config_value);
      default:
        return config.config_value;
    }
  }

  async setConfig(organizationId, key, value, type = 'string', description = null) {
    const configValue = type === 'json' ? JSON.stringify(value) : String(value);

    await db('tenant_configurations')
      .insert({
        organization_id: organizationId,
        config_key: key,
        config_value: configValue,
        config_type: type,
        description: description
      })
      .onConflict(['organization_id', 'config_key'])
      .merge({
        config_value: configValue,
        config_type: type,
        updated_at: new Date()
      });
  }

  /**
   * Resource quota management
   */
  async checkQuota(organizationId, resourceType) {
    const quota = await db('resource_quotas')
      .where({
        organization_id: organizationId,
        resource_type: resourceType
      })
      .where('period_end', '>', new Date())
      .first();

    if (!quota) {
      return { allowed: true, remaining: -1 };
    }

    if (!quota.enforce_limit) {
      return { allowed: true, remaining: -1 };
    }

    const remaining = quota.quota_limit - quota.quota_used;
    const allowed = quota.quota_limit === -1 || remaining > 0;

    return { allowed, remaining, used: quota.quota_used, limit: quota.quota_limit };
  }

  async incrementQuotaUsage(organizationId, resourceType, quantity = 1, metadata = null) {
    const trx = await db.transaction();

    try {
      const quota = await trx('resource_quotas')
        .where({
          organization_id: organizationId,
          resource_type: resourceType
        })
        .where('period_end', '>', new Date())
        .first();

      if (quota) {
        const newUsed = quota.quota_used + quantity;
        
        await trx('resource_quotas')
          .where({ id: quota.id })
          .update({
            quota_used: newUsed,
            updated_at: new Date()
          });

        // Check if alert threshold reached
        if (quota.alert_enabled && quota.quota_limit > 0) {
          const usagePercent = (newUsed / quota.quota_limit) * 100;
          if (usagePercent >= quota.alert_threshold_percent && !quota.last_alerted_at) {
            await trx('resource_quotas')
              .where({ id: quota.id })
              .update({ last_alerted_at: new Date() });
            
            // TODO: Send alert notification
            logger.warn('Quota threshold reached', {
              organizationId,
              resourceType,
              usagePercent: usagePercent.toFixed(2)
            });
          }
        }
      }

      // Log usage
      await trx('resource_usage_logs').insert({
        organization_id: organizationId,
        resource_type: resourceType,
        quantity: quantity,
        metadata: metadata ? JSON.stringify(metadata) : null
      });

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Helper methods
   */
  async generateUniqueSlug(name) {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (await db('organizations').where({ slug }).first()) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  getTrialEndDate(days = 14) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  async checkMemberQuota(organizationId, trx = db) {
    const org = await trx('organizations')
      .where({ id: organizationId })
      .first();

    if (!org || org.max_users === -1) {
      return true; // Unlimited
    }

    const memberCount = await trx('organization_members')
      .where({ organization_id: organizationId, status: 'active' })
      .count('* as count')
      .first();

    return parseInt(memberCount.count) < org.max_users;
  }

  async initializeQuotas(organizationId, plan, trx = db) {
    const quotas = this.defaultQuotas[plan];
    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const quotaInserts = [
      {
        organization_id: organizationId,
        resource_type: 'api_calls',
        quota_limit: quotas.api_calls,
        period: 'monthly',
        period_start: now,
        period_end: monthEnd
      },
      {
        organization_id: organizationId,
        resource_type: 'trades_per_day',
        quota_limit: quotas.trades_per_day,
        period: 'daily',
        period_start: now,
        period_end: new Date(now.getTime() + 24 * 60 * 60 * 1000)
      }
    ];

    await trx('resource_quotas').insert(quotaInserts);
  }

  async initializeDefaultConfig(organizationId, trx = db) {
    const defaultConfigs = [
      { key: 'timezone', value: 'UTC', type: 'string' },
      { key: 'currency', value: 'USD', type: 'string' },
      { key: 'trading_enabled', value: 'true', type: 'boolean' },
      { key: 'risk_level', value: 'medium', type: 'string' }
    ];

    const configInserts = defaultConfigs.map(config => ({
      organization_id: organizationId,
      config_key: config.key,
      config_value: config.value,
      config_type: config.type
    }));

    await trx('tenant_configurations').insert(configInserts);
  }

  async logActivity(data, trx = db) {
    await trx('organization_activity_logs').insert({
      organization_id: data.organization_id,
      user_id: data.user_id || null,
      action: data.action,
      resource_type: data.resource_type,
      resource_id: data.resource_id || null,
      changes: data.changes ? JSON.stringify(data.changes) : null,
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null
    });
  }
}

module.exports = new MultiTenantService();
