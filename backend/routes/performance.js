const express = require('express');
const performanceMonitoring = require('../middleware/performanceMonitoring');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const latencyService = performanceMonitoring.getLatencyService();

/**
 * GET /api/performance/metrics
 * Get comprehensive performance metrics
 */
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const { format = 'json', operation, exchange } = req.query;
    
    const metrics = latencyService.getMetrics();
    
    // Filter by operation if specified
    if (operation && metrics.operations[operation]) {
      metrics.operations = { [operation]: metrics.operations[operation] };
    }
    
    // Filter by exchange if specified
    if (exchange && metrics.exchanges[exchange]) {
      metrics.exchanges = { [exchange]: metrics.exchanges[exchange] };
    }
    
    if (format === 'prometheus') {
      res.set('Content-Type', 'text/plain');
      res.send(latencyService.exportPrometheusMetrics());
    } else if (format === 'csv') {
      res.set('Content-Type', 'text/csv');
      res.attachment('performance-metrics.csv');
      res.send(performanceMonitoring.exportPerformanceData('csv'));
    } else {
      res.json({
        success: true,
        data: metrics
      });
    }

  } catch (error) {
    logger.error('Failed to get performance metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance metrics'
    });
  }
});

/**
 * GET /api/performance/summary
 * Get performance summary dashboard
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const summary = performanceMonitoring.getPerformanceSummary();
    
    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    logger.error('Failed to get performance summary', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance summary'
    });
  }
});

/**
 * GET /api/performance/alerts
 * Get active performance alerts
 */
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const { severity } = req.query;
    let alerts = latencyService.getPerformanceAlerts();
    
    // Filter by severity if specified
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
        summary: {
          critical: alerts.filter(a => a.severity === 'critical').length,
          warning: alerts.filter(a => a.severity === 'warning').length,
          total: alerts.length
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to get performance alerts', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance alerts'
    });
  }
});

/**
 * GET /api/performance/operations/:operation/percentiles
 * Get detailed percentile analysis for specific operation
 */
router.get('/operations/:operation/percentiles', authenticateToken, async (req, res) => {
  try {
    const { operation } = req.params;
    const percentiles = latencyService.getPercentiles(operation);
    
    if (!percentiles) {
      return res.status(404).json({
        success: false,
        error: `No data found for operation: ${operation}`
      });
    }
    
    res.json({
      success: true,
      data: {
        operation,
        percentiles,
        threshold: latencyService.thresholds[operation] || null,
        thresholdExceeded: percentiles.p95 > (latencyService.thresholds[operation] || Number.MAX_VALUE)
      }
    });

  } catch (error) {
    logger.error('Failed to get operation percentiles', {
      operation: req.params.operation,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve operation percentiles'
    });
  }
});

/**
 * GET /api/performance/health
 * Get overall system performance health
 */
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const metrics = latencyService.getMetrics();
    const alerts = latencyService.getPerformanceAlerts();
    
    // Determine health status
    let healthStatus = 'healthy';
    let healthScore = 100;
    
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const warningAlerts = alerts.filter(a => a.severity === 'warning');
    
    if (criticalAlerts.length > 0) {
      healthStatus = 'critical';
      healthScore = Math.max(0, 100 - (criticalAlerts.length * 25));
    } else if (warningAlerts.length > 0) {
      healthStatus = 'warning';
      healthScore = Math.max(50, 100 - (warningAlerts.length * 10));
    } else if (metrics.system.p95Latency > 5000) {
      healthStatus = 'degraded';
      healthScore = 75;
    }
    
    const healthData = {
      status: healthStatus,
      score: healthScore,
      checks: {
        latency: {
          status: metrics.system.p95Latency < 2500 ? 'pass' : 'fail',
          value: Math.round(metrics.system.p95Latency * 100) / 100,
          threshold: 2500
        },
        errorRate: {
          status: (metrics.system.totalErrors / Math.max(1, metrics.system.totalRequests)) < 0.05 ? 'pass' : 'fail',
          value: Math.round((metrics.system.totalErrors / Math.max(1, metrics.system.totalRequests)) * 10000) / 100,
          threshold: 5.0
        },
        activeRequests: {
          status: metrics.realtime.activeRequests < 100 ? 'pass' : 'fail',
          value: metrics.realtime.activeRequests,
          threshold: 100
        }
      },
      alerts: {
        critical: criticalAlerts.length,
        warning: warningAlerts.length,
        total: alerts.length
      },
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: healthData
    });

  } catch (error) {
    logger.error('Failed to get performance health', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance health'
    });
  }
});

/**
 * DELETE /api/performance/metrics/reset
 * Reset performance metrics (admin only)
 */
router.delete('/metrics/reset', authenticateToken, async (req, res) => {
  try {
    // Check admin permissions
    if (!req.user.permissions.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: 'Admin permissions required'
      });
    }

    // Reset metrics
    latencyService.metrics.systemPerformance = {
      totalRequests: 0,
      totalErrors: 0,
      averageLatency: 0,
      p50Latency: 0,
      p90Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      maxLatency: 0,
      minLatency: Number.MAX_VALUE
    };
    
    latencyService.metrics.operationLatency.clear();
    latencyService.metrics.exchangeLatency.clear();
    latencyService.metrics.orderRoundTrip.clear();
    
    logger.info('Performance metrics reset', { userId: req.user.id });
    
    res.json({
      success: true,
      message: 'Performance metrics reset successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to reset performance metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to reset performance metrics'
    });
  }
});

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  logger.error('Performance router error', {
    error: error.message,
    stack: error.stack,
    url: req.url
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

module.exports = router;