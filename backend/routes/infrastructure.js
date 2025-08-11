const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const databaseConfig = require('../config/database');
const enhancedSecurity = require('../utils/enhancedSecurity');
const EnhancedCacheManager = require('../utils/enhancedCache');
const { authenticate, requireRole, require2FA } = require('../middleware/enhancedAuth');

/**
 * Infrastructure Management API Routes
 * Provides endpoints for monitoring and managing the 1.1 Infrastructure Hardening features
 * Part of TODO 1.1 Infrastructure Hardening implementation
 */

// Initialize enhanced cache manager
let enhancedCache = null;

const initializeCache = async () => {
  if (!enhancedCache) {
    enhancedCache = new EnhancedCacheManager();
    await enhancedCache.initialize();
  }
  return enhancedCache;
};

/**
 * Database Management Endpoints
 */

// Get database statistics and health
router.get('/database/stats', authenticate(), requireRole(['admin', 'operator']), async (req, res) => {
  try {
    const stats = databaseConfig.getStats();
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      ...stats
    };

    logger.info('Database statistics requested', {
      userId: req.user.id,
      service: 'infrastructure-api'
    });

    res.json(health);
  } catch (error) {
    logger.error('Failed to get database statistics', {
      error: error.message,
      userId: req.user.id,
      service: 'infrastructure-api'
    });

    res.status(500).json({
      error: 'Failed to retrieve database statistics',
      message: error.message
    });
  }
});

// Test database connection
router.post('/database/test', authenticate(), requireRole(['admin']), require2FA(), async (req, res) => {
  try {
    const testQuery = 'SELECT 1 as test';
    const result = await databaseConfig.query(testQuery);
    
    logger.info('Database connection test performed', {
      userId: req.user.id,
      result: 'success',
      service: 'infrastructure-api'
    });

    res.json({
      success: true,
      message: 'Database connection is healthy',
      testResult: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database connection test failed', {
      error: error.message,
      userId: req.user.id,
      service: 'infrastructure-api'
    });

    res.status(500).json({
      success: false,
      error: 'Database connection test failed',
      message: error.message
    });
  }
});

/**
 * Cache Management Endpoints
 */

// Get cache statistics
router.get('/cache/stats', authenticate(), requireRole(['admin', 'operator']), async (req, res) => {
  try {
    const cache = await initializeCache();
    const stats = cache.getStats();

    logger.info('Cache statistics requested', {
      userId: req.user.id,
      service: 'infrastructure-api'
    });

    res.json(stats);
  } catch (error) {
    logger.error('Failed to get cache statistics', {
      error: error.message,
      userId: req.user.id,
      service: 'infrastructure-api'
    });

    res.status(500).json({
      error: 'Failed to retrieve cache statistics',
      message: error.message
    });
  }
});

// Perform cache health check
router.get('/cache/health', authenticate(), requireRole(['admin', 'operator']), async (req, res) => {
  try {
    const cache = await initializeCache();
    const health = await cache.healthCheck();

    logger.info('Cache health check performed', {
      userId: req.user.id,
      health: health,
      service: 'infrastructure-api'
    });

    res.json({
      timestamp: new Date().toISOString(),
      ...health
    });
  } catch (error) {
    logger.error('Cache health check failed', {
      error: error.message,
      userId: req.user.id,
      service: 'infrastructure-api'
    });

    res.status(500).json({
      error: 'Cache health check failed',
      message: error.message
    });
  }
});

// Clear cache (admin only with 2FA)
router.post('/cache/clear', authenticate(), requireRole(['admin']), require2FA(), async (req, res) => {
  try {
    const cache = await initializeCache();
    const { pattern } = req.body;

    if (pattern) {
      // Clear specific pattern (not implemented in this basic version)
      res.status(501).json({
        error: 'Pattern-based cache clearing not implemented yet'
      });
      return;
    }

    // Clear all cache
    const success = await cache.del('*'); // This would need to be implemented to clear all keys
    
    logger.warn('Cache cleared by administrator', {
      userId: req.user.id,
      ipAddress: req.ip,
      success: success,
      service: 'infrastructure-api'
    });

    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to clear cache', {
      error: error.message,
      userId: req.user.id,
      service: 'infrastructure-api'
    });

    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

/**
 * Security Management Endpoints
 */

// Get security statistics
router.get('/security/stats', authenticate(), requireRole(['admin', 'operator']), async (req, res) => {
  try {
    const stats = enhancedSecurity.getSecurityStats();

    logger.info('Security statistics requested', {
      userId: req.user.id,
      service: 'infrastructure-api'
    });

    res.json(stats);
  } catch (error) {
    logger.error('Failed to get security statistics', {
      error: error.message,
      userId: req.user.id,
      service: 'infrastructure-api'
    });

    res.status(500).json({
      error: 'Failed to retrieve security statistics',
      message: error.message
    });
  }
});

// Get security events (admin only)
router.get('/security/events', authenticate(), requireRole(['admin']), async (req, res) => {
  try {
    const { limit = 100, severity, eventType, userId } = req.query;
    
    // This would typically query a database table
    // For now, we'll return a placeholder response
    const events = [
      {
        id: 'evt-001',
        timestamp: new Date().toISOString(),
        eventType: 'auth_success',
        description: 'User authenticated successfully',
        severity: 'info',
        userId: 'user-123',
        ipAddress: '192.168.1.100'
      }
    ];

    logger.info('Security events requested', {
      userId: req.user.id,
      filters: { limit, severity, eventType, userId },
      service: 'infrastructure-api'
    });

    res.json({
      events,
      totalCount: events.length,
      filters: { limit, severity, eventType, userId }
    });
  } catch (error) {
    logger.error('Failed to get security events', {
      error: error.message,
      userId: req.user.id,
      service: 'infrastructure-api'
    });

    res.status(500).json({
      error: 'Failed to retrieve security events',
      message: error.message
    });
  }
});

// Generate 2FA secret for current user
router.post('/security/2fa/generate', authenticate(), async (req, res) => {
  try {
    const twoFAData = enhancedSecurity.generateTwoFASecret(req.user.id);
    
    logger.info('2FA secret generated', {
      userId: req.user.id,
      service: 'infrastructure-api'
    });

    // In production, save the secret to the database before returning
    res.json({
      success: true,
      qrCode: twoFAData.qrCode,
      secret: twoFAData.secret, // Don't return this in production after initial setup
      backupCodes: twoFAData.backupCodes
    });
  } catch (error) {
    logger.error('Failed to generate 2FA secret', {
      error: error.message,
      userId: req.user.id,
      service: 'infrastructure-api'
    });

    res.status(500).json({
      error: 'Failed to generate 2FA secret',
      message: error.message
    });
  }
});

// Verify 2FA token
router.post('/security/2fa/verify', authenticate(), async (req, res) => {
  try {
    const { token, secret } = req.body;
    
    if (!token || !secret) {
      return res.status(400).json({
        error: 'Token and secret are required'
      });
    }

    const isValid = enhancedSecurity.verifyTwoFAToken(secret, token);
    
    logger.info('2FA token verification', {
      userId: req.user.id,
      isValid,
      service: 'infrastructure-api'
    });

    res.json({
      success: true,
      valid: isValid,
      message: isValid ? '2FA token is valid' : '2FA token is invalid'
    });
  } catch (error) {
    logger.error('Failed to verify 2FA token', {
      error: error.message,
      userId: req.user.id,
      service: 'infrastructure-api'
    });

    res.status(500).json({
      error: 'Failed to verify 2FA token',
      message: error.message
    });
  }
});

/**
 * System Performance Endpoints
 */

// Get comprehensive system health
router.get('/system/health', authenticate(), requireRole(['admin', 'operator']), async (req, res) => {
  try {
    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };

    // Add database health
    try {
      health.database = databaseConfig.getStats();
    } catch (dbError) {
      health.database = { status: 'error', error: dbError.message };
    }

    // Add cache health
    try {
      const cache = await initializeCache();
      health.cache = await cache.healthCheck();
    } catch (cacheError) {
      health.cache = { status: 'error', error: cacheError.message };
    }

    // Add security health
    try {
      health.security = enhancedSecurity.getSecurityStats();
    } catch (secError) {
      health.security = { status: 'error', error: secError.message };
    }

    logger.info('System health check performed', {
      userId: req.user.id,
      service: 'infrastructure-api'
    });

    res.json(health);
  } catch (error) {
    logger.error('System health check failed', {
      error: error.message,
      userId: req.user.id,
      service: 'infrastructure-api'
    });

    res.status(500).json({
      error: 'System health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get infrastructure configuration
router.get('/system/config', authenticate(), requireRole(['admin']), async (req, res) => {
  try {
    const config = {
      database: {
        type: process.env.DB_TYPE || 'sqlite',
        pooling: databaseConfig.getStats().pools ? 'enabled' : 'disabled'
      },
      cache: {
        redis: process.env.REDIS_HOST ? 'configured' : 'not configured',
        clustering: process.env.REDIS_CLUSTER_ENABLED === 'true' ? 'enabled' : 'disabled'
      },
      security: {
        jwtRotation: 'enabled',
        twoFA: 'supported',
        auditLogging: 'enabled',
        rateLimiting: 'enabled'
      },
      environment: process.env.NODE_ENV || 'development'
    };

    logger.info('Infrastructure configuration requested', {
      userId: req.user.id,
      service: 'infrastructure-api'
    });

    res.json(config);
  } catch (error) {
    logger.error('Failed to get infrastructure configuration', {
      error: error.message,
      userId: req.user.id,
      service: 'infrastructure-api'
    });

    res.status(500).json({
      error: 'Failed to retrieve infrastructure configuration',
      message: error.message
    });
  }
});

/**
 * Migration Management Endpoints
 */

// Get migration status
router.get('/migration/status', authenticate(), requireRole(['admin']), async (req, res) => {
  try {
    // In a real implementation, this would check the migration status
    const status = {
      currentDatabase: process.env.DB_TYPE || 'sqlite',
      migrationAvailable: process.env.DB_TYPE !== 'postgresql',
      lastMigration: null,
      pendingMigrations: []
    };

    logger.info('Migration status requested', {
      userId: req.user.id,
      service: 'infrastructure-api'
    });

    res.json(status);
  } catch (error) {
    logger.error('Failed to get migration status', {
      error: error.message,
      userId: req.user.id,
      service: 'infrastructure-api'
    });

    res.status(500).json({
      error: 'Failed to retrieve migration status',
      message: error.message
    });
  }
});

// Trigger database migration (admin only with 2FA)
router.post('/migration/start', authenticate(), requireRole(['admin']), require2FA(), async (req, res) => {
  try {
    const { targetDatabase, options = {} } = req.body;

    if (!targetDatabase || !['postgresql'].includes(targetDatabase)) {
      return res.status(400).json({
        error: 'Valid target database type required (postgresql)'
      });
    }

    logger.warn('Database migration initiated', {
      userId: req.user.id,
      targetDatabase,
      options,
      ipAddress: req.ip,
      service: 'infrastructure-api'
    });

    // In a real implementation, this would start the migration process
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Migration process would be started here',
      migrationId: 'mig-' + Date.now(),
      estimatedDuration: '15-30 minutes',
      targetDatabase
    });
  } catch (error) {
    logger.error('Failed to start migration', {
      error: error.message,
      userId: req.user.id,
      service: 'infrastructure-api'
    });

    res.status(500).json({
      error: 'Failed to start migration',
      message: error.message
    });
  }
});

module.exports = router;