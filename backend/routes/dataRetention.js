const express = require('express');
const { authenticateToken, requirePermissions, auditLog, logSecurityEvent } = require('../middleware/auth');
const dataRetentionService = require('../utils/dataRetentionService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Get all data retention policies
 * GET /api/data-retention/policies
 */
router.get('/policies',
  authenticateToken,
  requirePermissions(['admin']),
  async (req, res) => {
    try {
      const policies = await dataRetentionService.getActivePolicies();

      res.json({
        message: 'Data retention policies retrieved successfully',
        policies
      });
    } catch (error) {
      logger.error('Error getting data retention policies:', error);
      res.status(500).json({ error: 'Failed to retrieve data retention policies' });
    }
  }
);

/**
 * Create a new data retention policy
 * POST /api/data-retention/policies
 */
router.post('/policies',
  authenticateToken,
  requirePermissions(['admin']),
  auditLog('data_retention_policy_create'),
  logSecurityEvent('data_retention_policy_created', 'info', 'New data retention policy created'),
  async (req, res) => {
    try {
      const { tableName, retentionDays, conditionColumn = 'timestamp', conditionValue, description } = req.body;

      // Validation
      if (!tableName || !retentionDays) {
        return res.status(400).json({ error: 'Table name and retention days are required' });
      }

      if (retentionDays < 1 || retentionDays > 3650) {
        return res.status(400).json({ error: 'Retention days must be between 1 and 3650 (10 years)' });
      }

      const policy = await dataRetentionService.createPolicy(
        tableName,
        retentionDays,
        conditionColumn,
        conditionValue,
        description
      );

      logger.info(`Data retention policy created for ${tableName} by ${req.user.username}`);

      res.status(201).json({
        message: 'Data retention policy created successfully',
        policy
      });
    } catch (error) {
      logger.error('Error creating data retention policy:', error);
      
      if (error.message.includes('already exists')) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create data retention policy' });
      }
    }
  }
);

/**
 * Update a data retention policy
 * PUT /api/data-retention/policies/:policyId
 */
router.put('/policies/:policyId',
  authenticateToken,
  requirePermissions(['admin']),
  auditLog('data_retention_policy_update'),
  logSecurityEvent('data_retention_policy_updated', 'info', 'Data retention policy updated'),
  async (req, res) => {
    try {
      const { policyId } = req.params;
      const { retentionDays } = req.body;

      if (!retentionDays || retentionDays < 1 || retentionDays > 3650) {
        return res.status(400).json({ error: 'Retention days must be between 1 and 3650 (10 years)' });
      }

      await dataRetentionService.updatePolicy(policyId, retentionDays);

      logger.info(`Data retention policy ${policyId} updated by ${req.user.username}`);

      res.json({
        message: 'Data retention policy updated successfully'
      });
    } catch (error) {
      logger.error('Error updating data retention policy:', error);
      
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update data retention policy' });
      }
    }
  }
);

/**
 * Delete a data retention policy
 * DELETE /api/data-retention/policies/:policyId
 */
router.delete('/policies/:policyId',
  authenticateToken,
  requirePermissions(['admin']),
  auditLog('data_retention_policy_delete'),
  logSecurityEvent('data_retention_policy_deleted', 'warning', 'Data retention policy deleted'),
  async (req, res) => {
    try {
      const { policyId } = req.params;

      await dataRetentionService.deletePolicy(policyId);

      logger.info(`Data retention policy ${policyId} deleted by ${req.user.username}`);

      res.json({
        message: 'Data retention policy deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting data retention policy:', error);
      
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete data retention policy' });
      }
    }
  }
);

/**
 * Get cleanup statistics
 * GET /api/data-retention/stats
 */
router.get('/stats',
  authenticateToken,
  requirePermissions(['admin']),
  async (req, res) => {
    try {
      const stats = await dataRetentionService.getCleanupStats();

      res.json({
        message: 'Data retention statistics retrieved successfully',
        stats
      });
    } catch (error) {
      logger.error('Error getting data retention statistics:', error);
      res.status(500).json({ error: 'Failed to retrieve data retention statistics' });
    }
  }
);

/**
 * Run manual data cleanup
 * POST /api/data-retention/cleanup
 */
router.post('/cleanup',
  authenticateToken,
  requirePermissions(['admin']),
  auditLog('data_retention_manual_cleanup'),
  logSecurityEvent('data_retention_cleanup_executed', 'info', 'Manual data cleanup executed'),
  async (req, res) => {
    try {
      const results = await dataRetentionService.runCleanup();

      logger.info(`Manual data cleanup executed by ${req.user.username}`);

      res.json({
        message: 'Data cleanup completed successfully',
        results
      });
    } catch (error) {
      logger.error('Error running manual data cleanup:', error);
      res.status(500).json({ error: 'Failed to run data cleanup' });
    }
  }
);

module.exports = router;