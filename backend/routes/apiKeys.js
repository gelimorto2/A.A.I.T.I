const express = require('express');
const { authenticateToken, auditLog, logSecurityEvent } = require('../middleware/auth');
const apiKeyManager = require('../utils/apiKeyManager');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Generate a new API key
 * POST /api/api-keys
 */
router.post('/', 
  authenticateToken, 
  auditLog('api_key_create'),
  logSecurityEvent('api_key_generated', 'info', 'New API key generated'),
  async (req, res) => {
    try {
      const { name, permissions = ['read'], expiresAt } = req.body;

      // Validation
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'API key name is required' });
      }

      if (!Array.isArray(permissions) || permissions.length === 0) {
        return res.status(400).json({ error: 'At least one permission is required' });
      }

      // Validate permissions
      const validPermissions = ['read', 'write', 'admin', 'trading', 'analytics'];
      const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
      
      if (invalidPermissions.length > 0) {
        return res.status(400).json({ 
          error: 'Invalid permissions',
          invalidPermissions,
          validPermissions
        });
      }

      // Parse expiration date if provided
      let expirationDate = null;
      if (expiresAt) {
        expirationDate = new Date(expiresAt);
        if (isNaN(expirationDate.getTime()) || expirationDate <= new Date()) {
          return res.status(400).json({ error: 'Invalid expiration date. Must be in the future.' });
        }
      }

      // Generate the API key
      const apiKeyData = await apiKeyManager.generateKey(
        req.user.id,
        name.trim(),
        permissions,
        expirationDate
      );

      logger.info(`API key generated: ${name} for user ${req.user.username}`);

      res.status(201).json({
        message: 'API key generated successfully',
        apiKey: apiKeyData.apiKey, // Only returned once!
        keyInfo: {
          id: apiKeyData.id,
          name: apiKeyData.name,
          permissions: apiKeyData.permissions,
          expiresAt: apiKeyData.expiresAt,
          createdAt: apiKeyData.createdAt
        },
        warning: 'This is the only time the API key will be displayed. Store it securely!'
      });
    } catch (error) {
      logger.error('Error generating API key:', error);
      res.status(500).json({ error: 'Failed to generate API key' });
    }
  }
);

/**
 * List user's API keys
 * GET /api/api-keys
 */
router.get('/', 
  authenticateToken, 
  async (req, res) => {
    try {
      const apiKeys = await apiKeyManager.listKeys(req.user.id);

      res.json({
        message: 'API keys retrieved successfully',
        apiKeys
      });
    } catch (error) {
      logger.error('Error listing API keys:', error);
      res.status(500).json({ error: 'Failed to retrieve API keys' });
    }
  }
);

/**
 * Update API key permissions
 * PUT /api/api-keys/:keyId
 */
router.put('/:keyId', 
  authenticateToken, 
  auditLog('api_key_update'),
  logSecurityEvent('api_key_updated', 'info', 'API key permissions updated'),
  async (req, res) => {
    try {
      const { keyId } = req.params;
      const { permissions } = req.body;

      if (!Array.isArray(permissions) || permissions.length === 0) {
        return res.status(400).json({ error: 'At least one permission is required' });
      }

      // Validate permissions
      const validPermissions = ['read', 'write', 'admin', 'trading', 'analytics'];
      const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
      
      if (invalidPermissions.length > 0) {
        return res.status(400).json({ 
          error: 'Invalid permissions',
          invalidPermissions,
          validPermissions
        });
      }

      await apiKeyManager.updatePermissions(keyId, req.user.id, permissions);

      logger.info(`API key permissions updated: ${keyId} by user ${req.user.username}`);

      res.json({
        message: 'API key permissions updated successfully',
        permissions
      });
    } catch (error) {
      logger.error('Error updating API key:', error);
      
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update API key' });
      }
    }
  }
);

/**
 * Revoke an API key
 * DELETE /api/api-keys/:keyId
 */
router.delete('/:keyId', 
  authenticateToken, 
  auditLog('api_key_revoke'),
  logSecurityEvent('api_key_revoked', 'warning', 'API key revoked'),
  async (req, res) => {
    try {
      const { keyId } = req.params;

      await apiKeyManager.revokeKey(keyId, req.user.id);

      logger.info(`API key revoked: ${keyId} by user ${req.user.username}`);

      res.json({
        message: 'API key revoked successfully'
      });
    } catch (error) {
      logger.error('Error revoking API key:', error);
      
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to revoke API key' });
      }
    }
  }
);

/**
 * Get API key usage statistics
 * GET /api/api-keys/:keyId/stats
 */
router.get('/:keyId/stats', 
  authenticateToken, 
  async (req, res) => {
    try {
      const { keyId } = req.params;

      // Get API key details
      const apiKeys = await apiKeyManager.listKeys(req.user.id);
      const apiKey = apiKeys.find(key => key.id === keyId);

      if (!apiKey) {
        return res.status(404).json({ error: 'API key not found' });
      }

      // Get usage statistics from audit logs
      const { db } = require('../database/init');
      
      const usageStats = await new Promise((resolve, reject) => {
        db.all(`
          SELECT 
            DATE(timestamp) as date,
            COUNT(*) as requests,
            action
          FROM audit_logs 
          WHERE details LIKE '%"keyId":"${keyId}"%'
          GROUP BY DATE(timestamp), action
          ORDER BY date DESC
          LIMIT 30
        `, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      res.json({
        message: 'API key statistics retrieved successfully',
        keyInfo: apiKey,
        usageStats
      });
    } catch (error) {
      logger.error('Error getting API key stats:', error);
      res.status(500).json({ error: 'Failed to retrieve API key statistics' });
    }
  }
);

module.exports = router;