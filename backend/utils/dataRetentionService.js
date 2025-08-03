const { db } = require('../database/init');
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Data Retention Service
 * Manages automated cleanup of old data based on configurable policies
 */
class DataRetentionService {
  constructor() {
    this.defaultPolicies = [
      {
        table_name: 'audit_logs',
        retention_days: 365,
        condition_column: 'timestamp',
        description: 'Audit logs older than 1 year'
      },
      {
        table_name: 'security_events',
        retention_days: 180,
        condition_column: 'timestamp',
        description: 'Security events older than 6 months'
      },
      {
        table_name: 'market_data',
        retention_days: 90,
        condition_column: 'timestamp',
        description: 'Market data older than 3 months'
      },
      {
        table_name: 'bot_metrics',
        retention_days: 30,
        condition_column: 'timestamp',
        description: 'Bot metrics older than 1 month'
      },
      {
        table_name: 'ml_predictions',
        retention_days: 60,
        condition_column: 'timestamp',
        description: 'ML predictions older than 2 months'
      }
    ];
  }

  /**
   * Initialize default data retention policies
   */
  async initializePolicies() {
    try {
      for (const policy of this.defaultPolicies) {
        await this.createPolicy(
          policy.table_name,
          policy.retention_days,
          policy.condition_column,
          policy.condition_value,
          policy.description
        );
      }
      logger.info('Data retention policies initialized');
    } catch (error) {
      logger.error('Error initializing data retention policies:', error);
    }
  }

  /**
   * Create a new data retention policy
   * @param {string} tableName - Database table name
   * @param {number} retentionDays - Number of days to retain data
   * @param {string} conditionColumn - Column to check for date comparison
   * @param {string} conditionValue - Optional additional condition value
   * @param {string} description - Policy description
   */
  async createPolicy(tableName, retentionDays, conditionColumn = 'timestamp', conditionValue = null, description = '') {
    try {
      // Check if policy already exists
      const existingPolicy = await this.getPolicyByTable(tableName);
      if (existingPolicy) {
        logger.info(`Data retention policy for ${tableName} already exists`);
        return existingPolicy;
      }

      const policyId = uuidv4();
      const query = `
        INSERT INTO data_retention_policies 
        (id, table_name, retention_days, condition_column, condition_value, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      await this.runQuery(query, [
        policyId,
        tableName,
        retentionDays,
        conditionColumn,
        conditionValue,
        1
      ]);

      logger.info(`Data retention policy created for ${tableName}: ${retentionDays} days`);

      return {
        id: policyId,
        table_name: tableName,
        retention_days: retentionDays,
        condition_column: conditionColumn,
        condition_value: conditionValue,
        is_active: true
      };
    } catch (error) {
      logger.error(`Error creating data retention policy for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get all active data retention policies
   */
  async getActivePolicies() {
    try {
      const query = 'SELECT * FROM data_retention_policies WHERE is_active = 1';
      return await this.getAllQuery(query);
    } catch (error) {
      logger.error('Error getting active data retention policies:', error);
      throw error;
    }
  }

  /**
   * Get policy by table name
   */
  async getPolicyByTable(tableName) {
    try {
      const query = 'SELECT * FROM data_retention_policies WHERE table_name = ? AND is_active = 1';
      return await this.getQuery(query, [tableName]);
    } catch (error) {
      logger.error(`Error getting policy for table ${tableName}:`, error);
      return null;
    }
  }

  /**
   * Update a data retention policy
   * @param {string} policyId - Policy ID
   * @param {number} retentionDays - New retention period in days
   */
  async updatePolicy(policyId, retentionDays) {
    try {
      const query = `
        UPDATE data_retention_policies 
        SET retention_days = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;

      const result = await this.runQuery(query, [retentionDays, policyId]);

      if (result.changes === 0) {
        throw new Error('Policy not found');
      }

      logger.info(`Data retention policy ${policyId} updated to ${retentionDays} days`);
      return true;
    } catch (error) {
      logger.error(`Error updating data retention policy ${policyId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a data retention policy
   * @param {string} policyId - Policy ID
   */
  async deletePolicy(policyId) {
    try {
      const query = 'UPDATE data_retention_policies SET is_active = 0 WHERE id = ?';
      const result = await this.runQuery(query, [policyId]);

      if (result.changes === 0) {
        throw new Error('Policy not found');
      }

      logger.info(`Data retention policy ${policyId} deactivated`);
      return true;
    } catch (error) {
      logger.error(`Error deleting data retention policy ${policyId}:`, error);
      throw error;
    }
  }

  /**
   * Run data cleanup based on active policies
   */
  async runCleanup() {
    try {
      const policies = await this.getActivePolicies();
      const cleanupResults = [];

      for (const policy of policies) {
        try {
          const result = await this.cleanupTable(policy);
          cleanupResults.push({
            table: policy.table_name,
            recordsDeleted: result.changes,
            retentionDays: policy.retention_days,
            success: true
          });
        } catch (error) {
          logger.error(`Error cleaning up table ${policy.table_name}:`, error);
          cleanupResults.push({
            table: policy.table_name,
            recordsDeleted: 0,
            retentionDays: policy.retention_days,
            success: false,
            error: error.message
          });
        }
      }

      const totalDeleted = cleanupResults.reduce((sum, result) => sum + result.recordsDeleted, 0);
      
      if (totalDeleted > 0) {
        logger.info(`Data cleanup completed. Total records deleted: ${totalDeleted}`);
      }

      return cleanupResults;
    } catch (error) {
      logger.error('Error running data cleanup:', error);
      throw error;
    }
  }

  /**
   * Clean up a specific table based on its retention policy
   * @param {Object} policy - Data retention policy
   */
  async cleanupTable(policy) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

      let query = `DELETE FROM ${policy.table_name} WHERE ${policy.condition_column} < ?`;
      let params = [cutoffDate.toISOString()];

      // Add additional condition if specified
      if (policy.condition_value) {
        query += ' AND condition_column = ?';
        params.push(policy.condition_value);
      }

      const result = await this.runQuery(query, params);

      if (result.changes > 0) {
        logger.info(`Cleaned up ${result.changes} records from ${policy.table_name} older than ${policy.retention_days} days`);
      }

      return result;
    } catch (error) {
      logger.error(`Error cleaning up table ${policy.table_name}:`, error);
      throw error;
    }
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats() {
    try {
      const policies = await this.getActivePolicies();
      const stats = [];

      for (const policy of policies) {
        try {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

          // Count records that would be deleted
          const countQuery = `SELECT COUNT(*) as count FROM ${policy.table_name} WHERE ${policy.condition_column} < ?`;
          const result = await this.getQuery(countQuery, [cutoffDate.toISOString()]);

          // Count total records
          const totalQuery = `SELECT COUNT(*) as total FROM ${policy.table_name}`;
          const totalResult = await this.getQuery(totalQuery);

          stats.push({
            table: policy.table_name,
            retentionDays: policy.retention_days,
            recordsToDelete: result.count,
            totalRecords: totalResult.total,
            cutoffDate: cutoffDate.toISOString()
          });
        } catch (error) {
          logger.error(`Error getting stats for table ${policy.table_name}:`, error);
          stats.push({
            table: policy.table_name,
            retentionDays: policy.retention_days,
            recordsToDelete: 0,
            totalRecords: 0,
            error: error.message
          });
        }
      }

      return stats;
    } catch (error) {
      logger.error('Error getting cleanup statistics:', error);
      throw error;
    }
  }

  /**
   * Schedule automatic cleanup
   * @param {number} intervalHours - Hours between cleanup runs
   */
  scheduleCleanup(intervalHours = 24) {
    setInterval(async () => {
      try {
        logger.info('Starting scheduled data cleanup...');
        await this.runCleanup();
      } catch (error) {
        logger.error('Scheduled data cleanup failed:', error);
      }
    }, intervalHours * 60 * 60 * 1000);

    logger.info(`Data cleanup scheduled every ${intervalHours} hours`);
  }

  // Helper database methods
  async runQuery(query, params = []) {
    return new Promise((resolve, reject) => {
      db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  async getQuery(query, params = []) {
    return new Promise((resolve, reject) => {
      db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async getAllQuery(query, params = []) {
    return new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

// Singleton instance
const dataRetentionService = new DataRetentionService();

module.exports = dataRetentionService;