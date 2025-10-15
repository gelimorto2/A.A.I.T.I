const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { rbac, requireAdmin } = require('../middleware/rbacMiddleware');
const { scanner } = require('../services/dependencyScanner');
const { inputCanonicalizer } = require('../middleware/inputCanonicalizationMiddleware');
const { hmac } = require('../middleware/hmacMiddleware');
// Only load security regression suite in development/test environments
let SecurityRegressionSuite = null;
if (process.env.NODE_ENV !== 'production') {
  try {
    SecurityRegressionSuite = require('../tests/securityRegressionSuite');
  } catch (error) {
    console.log('Security regression suite not available in production');
  }
}

/**
 * Sprint 4: Security & Hardening API Routes
 * Security management, scanning, and monitoring endpoints
 */

/**
 * Get security overview
 */
router.get('/overview', requireAdmin(), async (req, res) => {
  try {
    const overview = {
      timestamp: new Date().toISOString(),
      rbac: {
        enabled: true,
        roles: Object.keys(rbac.permissions.roles),
        totalPermissions: Object.values(rbac.permissions.roles)
          .reduce((total, role) => total + role.permissions.length, 0)
      },
      hmac: {
        enabled: true,
        algorithm: hmac.algorithm,
        timestampWindow: hmac.timestampWindow,
        stats: hmac.getStats()
      },
      inputValidation: {
        enabled: true,
        maxStringLength: inputCanonicalizer.maxStringLength,
        maxArrayLength: inputCanonicalizer.maxArrayLength,
        suspiciousPatterns: inputCanonicalizer.suspiciousPatterns.length
      },
      dependencyScanning: {
        enabled: true,
        lastScan: scanner.lastScanTime ? new Date(scanner.lastScanTime).toISOString() : null,
        thresholds: scanner.vulnerabilityThreshold
      }
    };

    res.json({
      success: true,
      data: overview
    });

  } catch (error) {
    logger.error('Failed to get security overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security overview'
    });
  }
});

/**
 * Run dependency security scan
 */
router.post('/scan/dependencies', requireAdmin(), async (req, res) => {
  try {
    logger.info('Manual dependency scan initiated by admin');

    const results = await scanner.runScan();

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('Manual dependency scan failed:', error);
    res.status(500).json({
      success: false,
      error: 'Dependency scan failed',
      message: error.message
    });
  }
});

/**
 * Get last dependency scan results
 */
router.get('/scan/dependencies', requireAdmin(), (req, res) => {
  try {
    const results = scanner.getLastScanResults();

    if (!results) {
      return res.status(404).json({
        success: false,
        error: 'No scan results available',
        message: 'Run a dependency scan first'
      });
    }

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('Failed to get scan results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve scan results'
    });
  }
});

/**
 * Update vulnerability thresholds
 */
router.put('/scan/thresholds', requireAdmin(), (req, res) => {
  try {
    const { critical, high, moderate, low } = req.body;

    const thresholds = {};
    if (typeof critical === 'number') thresholds.critical = critical;
    if (typeof high === 'number') thresholds.high = high;
    if (typeof moderate === 'number') thresholds.moderate = moderate;
    if (typeof low === 'number') thresholds.low = low;

    scanner.setThresholds(thresholds);

    logger.info('Vulnerability thresholds updated by admin', {
      userId: req.user.id,
      thresholds
    });

    res.json({
      success: true,
      data: {
        message: 'Vulnerability thresholds updated',
        thresholds: scanner.vulnerabilityThreshold
      }
    });

  } catch (error) {
    logger.error('Failed to update thresholds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update thresholds'
    });
  }
});

/**
 * Exempt package from security scan
 */
router.post('/scan/exempt', requireAdmin(), (req, res) => {
  try {
    const { package: packageName, reason } = req.body;

    if (!packageName || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Package name and reason are required'
      });
    }

    scanner.exemptPackage(packageName, reason);

    logger.info('Package exempted from security scan', {
      userId: req.user.id,
      package: packageName,
      reason
    });

    res.json({
      success: true,
      data: {
        message: `Package ${packageName} exempted from security scan`,
        reason
      }
    });

  } catch (error) {
    logger.error('Failed to exempt package:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to exempt package'
    });
  }
});

/**
 * Remove package exemption
 */
router.delete('/scan/exempt/:package', requireAdmin(), (req, res) => {
  try {
    const { package: packageName } = req.params;

    scanner.removeExemption(packageName);

    logger.info('Package exemption removed', {
      userId: req.user.id,
      package: packageName
    });

    res.json({
      success: true,
      data: {
        message: `Package ${packageName} exemption removed`
      }
    });

  } catch (error) {
    logger.error('Failed to remove exemption:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove exemption'
    });
  }
});

/**
 * Run input validation fuzz tests
 */
router.post('/test/fuzzing', requireAdmin(), (req, res) => {
  try {
    logger.info('Manual fuzz testing initiated by admin');

    const results = inputCanonicalizer.runFuzzTests();

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('Fuzz testing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Fuzz testing failed',
      message: error.message
    });
  }
});

/**
 * Run comprehensive security regression tests
 */
router.post('/test/regression', requireAdmin(), async (req, res) => {
  try {
    if (!SecurityRegressionSuite) {
      return res.status(404).json({
        success: false,
        message: 'Security regression suite not available in production environment'
      });
    }

    logger.info('Security regression test suite initiated by admin');

    const securitySuite = new SecurityRegressionSuite(req.app);
    const results = await securitySuite.runAllTests();

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('Security regression tests failed:', error);
    res.status(500).json({
      success: false,
      error: 'Security regression tests failed',
      message: error.message
    });
  }
});

/**
 * Generate HMAC signature for client
 */
router.post('/hmac/generate', requireAdmin(), (req, res) => {
  try {
    const { method, path, body, userId } = req.body;

    if (!method || !path || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Method, path, and userId are required'
      });
    }

    // This would normally require the user's secret key
    // For demo purposes, we'll use a test secret
    const testSecret = 'test-secret-key';
    
    const signatureData = hmac.createClientSignature(testSecret, method, path, body);

    res.json({
      success: true,
      data: {
        ...signatureData,
        usage: {
          method,
          path,
          instructions: 'Include the headers in your request for HMAC authentication'
        }
      }
    });

  } catch (error) {
    logger.error('HMAC signature generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate HMAC signature'
    });
  }
});

/**
 * Get RBAC permissions matrix
 */
router.get('/rbac/permissions', requireAdmin(), (req, res) => {
  try {
    const permissions = {
      roles: rbac.permissions.roles,
      resources: rbac.permissions.resources,
      specialRules: rbac.permissions.special_rules,
      endpointPermissions: rbac.permissions.endpoint_permissions
    };

    res.json({
      success: true,
      data: permissions
    });

  } catch (error) {
    logger.error('Failed to get RBAC permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve RBAC permissions'
    });
  }
});

/**
 * Test user permissions
 */
router.post('/rbac/test', requireAdmin(), (req, res) => {
  try {
    const { role, permission, resourceOwner, userId } = req.body;

    if (!role || !permission) {
      return res.status(400).json({
        success: false,
        error: 'Role and permission are required'
      });
    }

    const hasPermission = rbac.hasPermission(role, permission, resourceOwner, userId);

    res.json({
      success: true,
      data: {
        role,
        permission,
        resourceOwner,
        userId,
        hasPermission,
        explanation: hasPermission ? 
          'Permission granted' : 
          'Permission denied - insufficient privileges'
      }
    });

  } catch (error) {
    logger.error('RBAC permission test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Permission test failed'
    });
  }
});

/**
 * Get security audit logs
 */
router.get('/audit', requireAdmin(), (req, res) => {
  try {
    const { limit = 100, offset = 0, severity, type } = req.query;

    // This would normally query an audit log database
    // For now, return a mock response
    const auditLogs = [
      {
        timestamp: new Date().toISOString(),
        type: 'RBAC_DENIAL',
        severity: 'WARNING',
        userId: 'user123',
        action: 'strategy:approve',
        resource: 'strategy456',
        result: 'DENIED',
        reason: 'Insufficient permissions'
      },
      {
        timestamp: new Date().toISOString(),
        type: 'INJECTION_ATTEMPT',
        severity: 'HIGH',
        ip: '192.168.1.100',
        payload: 'SELECT * FROM users',
        endpoint: '/api/auth/login',
        result: 'BLOCKED'
      }
    ];

    res.json({
      success: true,
      data: {
        logs: auditLogs,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: auditLogs.length
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit logs'
    });
  }
});

/**
 * Get security metrics
 */
router.get('/metrics', requireAdmin(), (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      requests: {
        total: 0, // Would come from actual metrics
        authenticated: 0,
        authorized: 0,
        blocked: 0
      },
      vulnerabilities: {
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0
      },
      threats: {
        injectionAttempts: 0,
        bruteForceAttempts: 0,
        suspiciousIPs: []
      },
      compliance: {
        lastAudit: null,
        status: 'COMPLIANT'
      }
    };

    // Get real data from scanner if available
    const scanResults = scanner.getLastScanResults();
    if (scanResults) {
      metrics.vulnerabilities = scanResults.vulnerabilities.summary;
    }

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Failed to get security metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security metrics'
    });
  }
});

module.exports = router;