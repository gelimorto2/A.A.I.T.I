const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { getPerformanceMonitor } = require('../utils/performanceMonitor');
const { getGitHubIssueReporter } = require('../utils/githubIssueReporter');

/**
 * Performance and Issue Reporting API Routes
 * Provides endpoints for monitoring system performance and GitHub issue reporting
 */

/**
 * Get current performance metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const performanceMonitor = getPerformanceMonitor();
    const metrics = performanceMonitor.getPerformanceMetrics();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics
    });
  } catch (error) {
    logger.error('Failed to get performance metrics', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance metrics',
      message: error.message
    });
  }
});

/**
 * Get GitHub issue reporter status
 */
router.get('/github/status', async (req, res) => {
  try {
    const githubReporter = getGitHubIssueReporter();
    const status = githubReporter.getStatus();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      github: status
    });
  } catch (error) {
    logger.error('Failed to get GitHub status', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve GitHub status',
      message: error.message
    });
  }
});

/**
 * Test GitHub connection
 */
router.post('/github/test', async (req, res) => {
  try {
    const githubReporter = getGitHubIssueReporter();
    const result = await githubReporter.testConnection();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      connection: result
    });
  } catch (error) {
    logger.error('GitHub connection test failed', error);
    res.status(500).json({
      success: false,
      error: 'GitHub connection test failed',
      message: error.message
    });
  }
});

/**
 * Manually create a test GitHub issue
 */
router.post('/github/test-issue', async (req, res) => {
  try {
    const { title, description, severity = 'info' } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }
    
    const githubReporter = getGitHubIssueReporter();
    const testError = new Error(title);
    testError.type = 'manual_test';
    
    const context = {
      severity,
      type: 'manual_test',
      description: description || 'This is a test issue created manually',
      user: req.user?.id || 'unknown',
      timestamp: new Date().toISOString()
    };
    
    const issue = await githubReporter.reportError(testError, context);
    
    if (issue) {
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        issue: {
          number: issue.number,
          url: issue.html_url,
          title: issue.title
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Issue creation was skipped (rate limited or filtered)'
      });
    }
  } catch (error) {
    logger.error('Failed to create test GitHub issue', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create test issue',
      message: error.message
    });
  }
});

/**
 * Reset performance metrics
 */
router.post('/metrics/reset', async (req, res) => {
  try {
    const performanceMonitor = getPerformanceMonitor();
    performanceMonitor.resetMetrics();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Performance metrics reset successfully'
    });
  } catch (error) {
    logger.error('Failed to reset performance metrics', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset performance metrics',
      message: error.message
    });
  }
});

/**
 * Trigger performance optimization
 */
router.post('/optimize', async (req, res) => {
  try {
    const performanceMonitor = getPerformanceMonitor();
    
    // Force memory optimization
    performanceMonitor.optimizeMemory();
    
    // Get updated metrics
    const metrics = performanceMonitor.getPerformanceMetrics();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Performance optimization triggered',
      metrics: {
        memory: metrics.memory,
        uptime: metrics.uptime
      }
    });
  } catch (error) {
    logger.error('Failed to trigger performance optimization', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger optimization',
      message: error.message
    });
  }
});

/**
 * Get health status with performance indicators
 */
router.get('/health', async (req, res) => {
  try {
    const performanceMonitor = getPerformanceMonitor();
    const githubReporter = getGitHubIssueReporter();
    
    const metrics = performanceMonitor.getPerformanceMetrics();
    const githubStatus = githubReporter.getStatus();
    
    // Determine health status
    const memoryUsage = metrics.memory.usage;
    const cpuUsage = metrics.cpu.usage;
    const errorRate = metrics.requests.errorRate;
    
    const thresholds = metrics.thresholds;
    const isHealthy = 
      memoryUsage < thresholds.memoryUsage &&
      cpuUsage < thresholds.cpuUsage &&
      errorRate < thresholds.errorRate;
    
    const status = isHealthy ? 'healthy' : 'degraded';
    const statusCode = isHealthy ? 200 : 503;
    
    res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      performance: {
        memory: {
          usage: `${(memoryUsage * 100).toFixed(2)}%`,
          threshold: `${(thresholds.memoryUsage * 100).toFixed(2)}%`,
          healthy: memoryUsage < thresholds.memoryUsage
        },
        cpu: {
          usage: `${(cpuUsage * 100).toFixed(2)}%`,
          threshold: `${(thresholds.cpuUsage * 100).toFixed(2)}%`,
          healthy: cpuUsage < thresholds.cpuUsage
        },
        requests: {
          errorRate: `${(errorRate * 100).toFixed(2)}%`,
          threshold: `${(thresholds.errorRate * 100).toFixed(2)}%`,
          healthy: errorRate < thresholds.errorRate,
          total: metrics.requests.total,
          rps: metrics.requests.requestsPerSecond.toFixed(2)
        }
      },
      services: {
        github: {
          enabled: githubStatus.enabled,
          configured: githubStatus.configured,
          rateLimitOk: githubStatus.rateLimitOk
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get health status', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Failed to retrieve health status',
      message: error.message
    });
  }
});

module.exports = router;