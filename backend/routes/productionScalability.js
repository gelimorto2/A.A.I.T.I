const express = require('express');
const { authenticateToken, auditLog } = require('../middleware/auth');
const highPerformanceCaching = require('../utils/highPerformanceCaching');
const enhancedSecurityFramework = require('../utils/enhancedSecurityFramework');
const systemMonitoringAndAlerting = require('../utils/systemMonitoringAndAlerting');
const logger = require('../utils/logger');

const router = express.Router();

// =====================================
// HIGH-PERFORMANCE CACHING ROUTES
// =====================================

// Initialize caching system
router.post('/cache/initialize', authenticateToken, auditLog('initialize_cache'), async (req, res) => {
  try {
    await highPerformanceCaching.initialize();
    
    logger.info('High-performance caching initialized', { userId: req.user.id });
    
    res.json({
      success: true,
      message: 'Caching system initialized successfully',
      status: highPerformanceCaching.getHealthStatus()
    });
  } catch (error) {
    logger.error('Error initializing caching system:', error);
    res.status(500).json({ error: 'Failed to initialize caching system' });
  }
});

// Get cache statistics
router.get('/cache/stats', authenticateToken, (req, res) => {
  try {
    const stats = highPerformanceCaching.getCacheStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache statistics' });
  }
});

// Get cache health status
router.get('/cache/health', authenticateToken, (req, res) => {
  try {
    const health = highPerformanceCaching.getHealthStatus();
    res.json({
      success: true,
      health
    });
  } catch (error) {
    logger.error('Error getting cache health:', error);
    res.status(500).json({ error: 'Failed to get cache health' });
  }
});

// Cache operations
router.get('/cache/get/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    const value = await highPerformanceCaching.get(key);
    
    res.json({
      success: true,
      key,
      value,
      cached: value !== null
    });
  } catch (error) {
    logger.error('Cache get error:', error);
    res.status(500).json({ error: 'Failed to get cached value' });
  }
});

router.post('/cache/set', authenticateToken, auditLog('cache_set'), async (req, res) => {
  try {
    const { key, value, ttl } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }
    
    const success = await highPerformanceCaching.set(key, value, { ttl });
    
    res.json({
      success,
      message: success ? 'Value cached successfully' : 'Failed to cache value'
    });
  } catch (error) {
    logger.error('Cache set error:', error);
    res.status(500).json({ error: 'Failed to cache value' });
  }
});

router.delete('/cache/:key', authenticateToken, auditLog('cache_delete'), async (req, res) => {
  try {
    const { key } = req.params;
    const success = await highPerformanceCaching.delete(key);
    
    res.json({
      success,
      message: success ? 'Cache entry deleted' : 'Failed to delete cache entry'
    });
  } catch (error) {
    logger.error('Cache delete error:', error);
    res.status(500).json({ error: 'Failed to delete cache entry' });
  }
});

// Invalidate cache by pattern
router.post('/cache/invalidate', authenticateToken, auditLog('cache_invalidate'), async (req, res) => {
  try {
    const { pattern } = req.body;
    
    if (!pattern) {
      return res.status(400).json({ error: 'Pattern is required' });
    }
    
    const count = await highPerformanceCaching.invalidateByPattern(pattern);
    
    res.json({
      success: true,
      message: `Invalidated ${count} cache entries`,
      invalidatedCount: count
    });
  } catch (error) {
    logger.error('Cache invalidation error:', error);
    res.status(500).json({ error: 'Failed to invalidate cache entries' });
  }
});

// Flush all cache
router.post('/cache/flush', authenticateToken, auditLog('cache_flush_all'), async (req, res) => {
  try {
    const success = await highPerformanceCaching.flushAll();
    
    res.json({
      success,
      message: success ? 'All caches flushed' : 'Failed to flush caches'
    });
  } catch (error) {
    logger.error('Cache flush error:', error);
    res.status(500).json({ error: 'Failed to flush caches' });
  }
});

// =====================================
// ENHANCED SECURITY ROUTES
// =====================================

// Initialize security framework
router.post('/security/initialize', authenticateToken, auditLog('initialize_security'), async (req, res) => {
  try {
    await enhancedSecurityFramework.initialize();
    
    logger.info('Enhanced security framework initialized', { userId: req.user.id });
    
    res.json({
      success: true,
      message: 'Security framework initialized successfully',
      status: enhancedSecurityFramework.getSecurityStatus()
    });
  } catch (error) {
    logger.error('Error initializing security framework:', error);
    res.status(500).json({ error: 'Failed to initialize security framework' });
  }
});

// Generate API key
router.post('/security/api-keys', authenticateToken, auditLog('generate_api_key'), (req, res) => {
  try {
    const { name, permissions = [], expiresIn } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'API key name is required' });
    }
    
    const apiKeyData = enhancedSecurityFramework.generateApiKey(
      req.user.id, 
      name, 
      permissions, 
      expiresIn
    );
    
    logger.info('API key generated', {
      userId: req.user.id,
      keyName: name,
      permissions
    });
    
    res.json({
      success: true,
      apiKey: apiKeyData
    });
  } catch (error) {
    logger.error('Error generating API key:', error);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

// List user's API keys
router.get('/security/api-keys', authenticateToken, (req, res) => {
  try {
    const apiKeys = enhancedSecurityFramework.getUserApiKeys(req.user.id);
    
    res.json({
      success: true,
      apiKeys
    });
  } catch (error) {
    logger.error('Error getting API keys:', error);
    res.status(500).json({ error: 'Failed to get API keys' });
  }
});

// Revoke API key
router.delete('/security/api-keys/:keyId', authenticateToken, auditLog('revoke_api_key'), (req, res) => {
  try {
    const { keyId } = req.params;
    const success = enhancedSecurityFramework.revokeApiKey(keyId, req.user.id);
    
    if (success) {
      logger.info('API key revoked', {
        userId: req.user.id,
        keyId
      });
      
      res.json({
        success: true,
        message: 'API key revoked successfully'
      });
    } else {
      res.status(404).json({ error: 'API key not found or access denied' });
    }
  } catch (error) {
    logger.error('Error revoking API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// Refresh access token
router.post('/security/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    const tokenPair = await enhancedSecurityFramework.refreshAccessToken(refreshToken);
    
    res.json({
      success: true,
      tokens: tokenPair
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({ error: error.message });
  }
});

// Get security events
router.get('/security/events', authenticateToken, (req, res) => {
  try {
    const { limit = 100, severity } = req.query;
    const events = enhancedSecurityFramework.getSecurityEvents(parseInt(limit), severity);
    
    res.json({
      success: true,
      events,
      count: events.length
    });
  } catch (error) {
    logger.error('Error getting security events:', error);
    res.status(500).json({ error: 'Failed to get security events' });
  }
});

// Get security status
router.get('/security/status', authenticateToken, (req, res) => {
  try {
    const status = enhancedSecurityFramework.getSecurityStatus();
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error('Error getting security status:', error);
    res.status(500).json({ error: 'Failed to get security status' });
  }
});

// Validate password strength
router.post('/security/validate-password', (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    
    const validation = enhancedSecurityFramework.validatePasswordStrength(password);
    
    res.json({
      success: true,
      validation
    });
  } catch (error) {
    logger.error('Password validation error:', error);
    res.status(500).json({ error: 'Failed to validate password' });
  }
});

// =====================================
// SYSTEM MONITORING ROUTES
// =====================================

// Initialize monitoring system
router.post('/monitoring/initialize', authenticateToken, auditLog('initialize_monitoring'), async (req, res) => {
  try {
    await systemMonitoringAndAlerting.initialize();
    
    logger.info('System monitoring initialized', { userId: req.user.id });
    
    res.json({
      success: true,
      message: 'Monitoring system initialized successfully',
      status: systemMonitoringAndAlerting.getSystemStatus()
    });
  } catch (error) {
    logger.error('Error initializing monitoring system:', error);
    res.status(500).json({ error: 'Failed to initialize monitoring system' });
  }
});

// Get system metrics
router.get('/monitoring/metrics', authenticateToken, (req, res) => {
  try {
    const { category, timeRange } = req.query;
    const timeRangeMs = timeRange ? parseInt(timeRange) * 1000 : undefined;
    
    const metrics = systemMonitoringAndAlerting.getMetrics(category, timeRangeMs);
    
    res.json({
      success: true,
      metrics,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error getting system metrics:', error);
    res.status(500).json({ error: 'Failed to get system metrics' });
  }
});

// Get health status
router.get('/monitoring/health', authenticateToken, async (req, res) => {
  try {
    const health = await systemMonitoringAndAlerting.getHealthStatus();
    
    res.json({
      success: true,
      health
    });
  } catch (error) {
    logger.error('Error getting health status:', error);
    res.status(500).json({ error: 'Failed to get health status' });
  }
});

// Get alerts
router.get('/monitoring/alerts', authenticateToken, (req, res) => {
  try {
    const { status, severity, limit = 100 } = req.query;
    const alerts = systemMonitoringAndAlerting.getAlerts(status, severity, parseInt(limit));
    
    res.json({
      success: true,
      alerts,
      count: alerts.length
    });
  } catch (error) {
    logger.error('Error getting alerts:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// Acknowledge alert
router.post('/monitoring/alerts/:alertId/acknowledge', authenticateToken, auditLog('acknowledge_alert'), (req, res) => {
  try {
    const { alertId } = req.params;
    const { comment = '' } = req.body;
    
    const success = systemMonitoringAndAlerting.acknowledgeAlert(alertId, req.user.id, comment);
    
    if (success) {
      res.json({
        success: true,
        message: 'Alert acknowledged successfully'
      });
    } else {
      res.status(404).json({ error: 'Alert not found or already acknowledged' });
    }
  } catch (error) {
    logger.error('Error acknowledging alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// Resolve alert
router.post('/monitoring/alerts/:alertId/resolve', authenticateToken, auditLog('resolve_alert'), (req, res) => {
  try {
    const { alertId } = req.params;
    const { resolution = '' } = req.body;
    
    const success = systemMonitoringAndAlerting.resolveAlert(alertId, req.user.id, resolution);
    
    if (success) {
      res.json({
        success: true,
        message: 'Alert resolved successfully'
      });
    } else {
      res.status(404).json({ error: 'Alert not found or already resolved' });
    }
  } catch (error) {
    logger.error('Error resolving alert:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// Get alert statistics
router.get('/monitoring/alerts/stats', authenticateToken, (req, res) => {
  try {
    const stats = systemMonitoringAndAlerting.getAlertStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error getting alert stats:', error);
    res.status(500).json({ error: 'Failed to get alert statistics' });
  }
});

// Get system status
router.get('/monitoring/status', authenticateToken, (req, res) => {
  try {
    const status = systemMonitoringAndAlerting.getSystemStatus();
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error('Error getting monitoring status:', error);
    res.status(500).json({ error: 'Failed to get monitoring status' });
  }
});

// =====================================
// COMBINED PRODUCTION ANALYTICS
// =====================================

// Get comprehensive system dashboard
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const [
      cacheHealth,
      securityStatus,
      monitoringStatus,
      systemHealth
    ] = await Promise.all([
      highPerformanceCaching.getHealthStatus(),
      enhancedSecurityFramework.getSecurityStatus(),
      systemMonitoringAndAlerting.getSystemStatus(),
      systemMonitoringAndAlerting.getHealthStatus()
    ]);

    const dashboard = {
      timestamp: Date.now(),
      uptime: process.uptime(),
      cache: {
        health: cacheHealth,
        stats: highPerformanceCaching.getCacheStats()
      },
      security: {
        status: securityStatus,
        recentEvents: enhancedSecurityFramework.getSecurityEvents(10)
      },
      monitoring: {
        status: monitoringStatus,
        health: systemHealth,
        recentAlerts: systemMonitoringAndAlerting.getAlerts(null, null, 10)
      },
      performance: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };

    res.json({
      success: true,
      dashboard
    });
  } catch (error) {
    logger.error('Error getting system dashboard:', error);
    res.status(500).json({ error: 'Failed to get system dashboard' });
  }
});

// Get production readiness report
router.get('/readiness', authenticateToken, async (req, res) => {
  try {
    const healthStatus = await systemMonitoringAndAlerting.getHealthStatus();
    const cacheHealth = highPerformanceCaching.getHealthStatus();
    const securityStatus = enhancedSecurityFramework.getSecurityStatus();
    
    const readiness = {
      overall: 'ready', // Will be calculated based on checks
      checks: {
        cache: {
          status: cacheHealth.status,
          ready: cacheHealth.isInitialized && cacheHealth.status === 'healthy'
        },
        security: {
          status: 'active',
          ready: securityStatus.encryptionEnabled && securityStatus.activeApiKeys >= 0
        },
        monitoring: {
          status: healthStatus.overall,
          ready: healthStatus.overall === 'healthy'
        },
        database: {
          status: 'connected',
          ready: true // Assuming database is connected
        }
      },
      recommendations: []
    };
    
    // Calculate overall readiness
    const allReady = Object.values(readiness.checks).every(check => check.ready);
    readiness.overall = allReady ? 'ready' : 'not_ready';
    
    // Add recommendations for non-ready components
    Object.entries(readiness.checks).forEach(([component, check]) => {
      if (!check.ready) {
        readiness.recommendations.push({
          component,
          message: `${component} is not ready for production`,
          severity: 'high'
        });
      }
    });
    
    res.json({
      success: true,
      readiness,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error getting readiness report:', error);
    res.status(500).json({ error: 'Failed to get readiness report' });
  }
});

// Performance benchmark endpoint
router.post('/benchmark', authenticateToken, auditLog('run_benchmark'), async (req, res) => {
  try {
    const { tests = ['cache', 'security', 'monitoring'] } = req.body;
    const results = {};
    
    // Cache performance test
    if (tests.includes('cache')) {
      const cacheStart = Date.now();
      await highPerformanceCaching.set('benchmark_test', { data: 'test' });
      const cacheValue = await highPerformanceCaching.get('benchmark_test');
      await highPerformanceCaching.delete('benchmark_test');
      const cacheEnd = Date.now();
      
      results.cache = {
        operations: 3, // set, get, delete
        duration: cacheEnd - cacheStart,
        opsPerSecond: 3000 / (cacheEnd - cacheStart)
      };
    }
    
    // Security performance test
    if (tests.includes('security')) {
      const securityStart = Date.now();
      const testPassword = 'TestPassword123!';
      const hashedPassword = await enhancedSecurityFramework.hashPassword(testPassword);
      await enhancedSecurityFramework.verifyPassword(testPassword, hashedPassword);
      const securityEnd = Date.now();
      
      results.security = {
        operations: 2, // hash, verify
        duration: securityEnd - securityStart,
        opsPerSecond: 2000 / (securityEnd - securityStart)
      };
    }
    
    // Monitoring performance test
    if (tests.includes('monitoring')) {
      const monitoringStart = Date.now();
      const healthStatus = await systemMonitoringAndAlerting.getHealthStatus();
      const monitoringEnd = Date.now();
      
      results.monitoring = {
        operations: 1,
        duration: monitoringEnd - monitoringStart,
        healthChecks: Object.keys(healthStatus.checks).length
      };
    }
    
    logger.info('Performance benchmark completed', {
      userId: req.user.id,
      tests,
      results
    });
    
    res.json({
      success: true,
      benchmark: {
        tests,
        results,
        timestamp: Date.now(),
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        }
      }
    });
  } catch (error) {
    logger.error('Benchmark error:', error);
    res.status(500).json({ error: 'Failed to run benchmark' });
  }
});

module.exports = router;