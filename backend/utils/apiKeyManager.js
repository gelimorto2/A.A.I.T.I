const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/init');
const { generateApiKey, hashApiKey, verifyApiKey } = require('../utils/encryption');
const logger = require('../utils/logger');

/**
 * API Key Management Service
 * Provides secure API key generation, storage, and validation
 */
class ApiKeyManager {
  /**
   * Generate a new API key for a user
   * @param {string} userId - User ID
   * @param {string} name - Descriptive name for the API key
   * @param {Array} permissions - Array of permissions for this API key
   * @param {Date} expiresAt - Optional expiration date
   * @returns {Promise<Object>} - API key details
   */
  async generateKey(userId, name, permissions = ['read'], expiresAt = null) {
    try {
      // Validate inputs
      if (!userId || !name) {
        throw new Error('User ID and name are required');
      }

      // Check if user exists
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate API key
      const apiKey = generateApiKey(64); // 64-byte key for high security
      const { hash, salt } = hashApiKey(apiKey);
      const keyId = uuidv4();

      // Store in database
      const query = `
        INSERT INTO api_keys (
          id, user_id, name, key_hash, key_salt, permissions, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      await this.runQuery(query, [
        keyId,
        userId,
        name,
        hash,
        salt,
        JSON.stringify(permissions),
        expiresAt
      ]);

      logger.info(`API key generated for user ${userId}: ${name}`);

      // Return the plain API key only once (never stored in plain text)
      return {
        id: keyId,
        name,
        apiKey: apiKey, // This is the only time the plain key is returned
        permissions,
        expiresAt,
        createdAt: new Date()
      };
    } catch (error) {
      logger.error('Error generating API key:', error);
      throw error;
    }
  }

  /**
   * Validate an API key
   * @param {string} apiKey - The API key to validate
   * @returns {Promise<Object|null>} - User and key info if valid, null if invalid
   */
  async validateKey(apiKey) {
    try {
      if (!apiKey) {
        return null;
      }

      // Get all active API keys
      const query = `
        SELECT ak.*, u.username, u.email, u.role, u.is_active as user_active
        FROM api_keys ak
        JOIN users u ON ak.user_id = u.id
        WHERE ak.is_active = 1 AND u.is_active = 1
      `;

      const keys = await this.getAllQuery(query);

      // Check each key
      for (const keyRecord of keys) {
        // Check if key has expired
        if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
          continue;
        }

        // Verify the API key
        if (verifyApiKey(apiKey, keyRecord.key_hash, keyRecord.key_salt)) {
          // Update last used timestamp
          await this.runQuery(
            'UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = ?',
            [keyRecord.id]
          );

          logger.info(`API key validated for user ${keyRecord.username}`);

          return {
            keyId: keyRecord.id,
            userId: keyRecord.user_id,
            username: keyRecord.username,
            email: keyRecord.email,
            role: keyRecord.role,
            permissions: JSON.parse(keyRecord.permissions),
            name: keyRecord.name
          };
        }
      }

      logger.warn('Invalid API key attempt');
      return null;
    } catch (error) {
      logger.error('Error validating API key:', error);
      return null;
    }
  }

  /**
   * List API keys for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of API key info (without actual keys)
   */
  async listKeys(userId) {
    try {
      const query = `
        SELECT id, name, permissions, last_used, expires_at, is_active, created_at
        FROM api_keys
        WHERE user_id = ?
        ORDER BY created_at DESC
      `;

      const keys = await this.getAllQuery(query, [userId]);

      return keys.map(key => ({
        ...key,
        permissions: JSON.parse(key.permissions),
        isExpired: key.expires_at && new Date(key.expires_at) < new Date()
      }));
    } catch (error) {
      logger.error('Error listing API keys:', error);
      throw error;
    }
  }

  /**
   * Revoke (deactivate) an API key
   * @param {string} keyId - API key ID
   * @param {string} userId - User ID (for ownership verification)
   * @returns {Promise<boolean>} - Success status
   */
  async revokeKey(keyId, userId) {
    try {
      const query = `
        UPDATE api_keys 
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND user_id = ?
      `;

      const result = await this.runQuery(query, [keyId, userId]);

      if (result.changes === 0) {
        throw new Error('API key not found or access denied');
      }

      logger.info(`API key revoked: ${keyId} by user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error revoking API key:', error);
      throw error;
    }
  }

  /**
   * Update API key permissions
   * @param {string} keyId - API key ID
   * @param {string} userId - User ID (for ownership verification)
   * @param {Array} permissions - New permissions array
   * @returns {Promise<boolean>} - Success status
   */
  async updatePermissions(keyId, userId, permissions) {
    try {
      const query = `
        UPDATE api_keys 
        SET permissions = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND user_id = ? AND is_active = 1
      `;

      const result = await this.runQuery(query, [
        JSON.stringify(permissions),
        keyId,
        userId
      ]);

      if (result.changes === 0) {
        throw new Error('API key not found or access denied');
      }

      logger.info(`API key permissions updated: ${keyId} by user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error updating API key permissions:', error);
      throw error;
    }
  }

  /**
   * Clean up expired API keys
   * @returns {Promise<number>} - Number of keys cleaned up
   */
  async cleanupExpiredKeys() {
    try {
      const query = `
        UPDATE api_keys 
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
        WHERE expires_at < CURRENT_TIMESTAMP AND is_active = 1
      `;

      const result = await this.runQuery(query);
      const cleanedCount = result.changes;

      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired API keys`);
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Error cleaning up expired API keys:', error);
      throw error;
    }
  }

  // Helper methods for database operations
  async getUserById(userId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async runQuery(query, params = []) {
    return new Promise((resolve, reject) => {
      db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve(this);
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
const apiKeyManager = new ApiKeyManager();

module.exports = apiKeyManager;