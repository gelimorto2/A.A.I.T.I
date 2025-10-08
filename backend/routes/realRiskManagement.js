const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { rbac, requireRole } = require('../middleware/rbacMiddleware');
const RealRiskEngine = require('../services/realRiskEngine');
const logger = require('../utils/logger');

const router = express.Router();

// Initialize Real Risk Engine
const riskEngine = new RealRiskEngine();

/**
 * Sprint 5: Real Risk Engine API Routes
 * Production-grade risk management with enforcement and audit trail
 */

/**
 * Pre-trade risk check endpoint
 */
router.post('/check/pre-trade', authenticateToken, rbac(['admin', 'trader']), async (req, res) => {
  try {
    const { portfolioId, symbol, side, quantity, price, orderType } = req.body;

    if (!portfolioId || !symbol || !side || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: portfolioId, symbol, side, quantity'
      });
    }

    const tradeRequest = {
      userId: req.user.id,
      portfolioId,
      symbol: symbol.toUpperCase(),
      side: side.toLowerCase(),
      quantity: parseFloat(quantity),
      price: price ? parseFloat(price) : null,
      orderType: orderType || 'market',
      value: parseFloat(quantity) * (price || 50000) // Estimate value
    };

    const riskCheck = await riskEngine.enforcePreTradeRisk(tradeRequest);

    res.json({
      success: true,
      riskCheck,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Pre-trade risk check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Risk check failed',
      message: error.message
    });
  }
});

/**
 * Batch pre-trade risk check for multiple orders
 */
router.post('/check/batch', authenticateToken, rbac(['admin', 'trader']), async (req, res) => {
  try {
    const { trades } = req.body;

    if (!Array.isArray(trades) || trades.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'trades must be a non-empty array'
      });
    }

    const results = [];
    let totalApproved = 0;

    for (const trade of trades) {
      const tradeRequest = {
        userId: req.user.id,
        portfolioId: trade.portfolioId,
        symbol: trade.symbol.toUpperCase(),
        side: trade.side.toLowerCase(),
        quantity: parseFloat(trade.quantity),
        price: trade.price ? parseFloat(trade.price) : null,
        value: parseFloat(trade.quantity) * (trade.price || 50000)
      };

      const riskCheck = await riskEngine.enforcePreTradeRisk(tradeRequest);
      results.push({
        tradeIndex: results.length,
        symbol: trade.symbol,
        riskCheck
      });

      if (riskCheck.approved) {
        totalApproved++;
      }
    }

    res.json({
      success: true,
      totalTrades: trades.length,
      totalApproved,
      totalRejected: trades.length - totalApproved,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Batch risk check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Batch risk check failed',
      message: error.message
    });
  }
});

/**
 * Get risk audit trail
 */
router.get('/audit/trail', authenticateToken, rbac(['admin', 'trader', 'analyst']), async (req, res) => {
  try {
    const { portfolioId, limit = 100, severity, riskType } = req.query;

    let auditTrail = await riskEngine.getAuditTrail(portfolioId, parseInt(limit));

    // Filter by severity if specified
    if (severity) {
      auditTrail = auditTrail.filter(entry => entry.severity === severity);
    }

    // Filter by risk type if specified
    if (riskType) {
      auditTrail = auditTrail.filter(entry => entry.risk_type === riskType);
    }

    res.json({
      success: true,
      data: {
        auditTrail,
        totalEntries: auditTrail.length,
        filters: {
          portfolioId: portfolioId || 'all',
          limit: parseInt(limit),
          severity: severity || 'all',
          riskType: riskType || 'all'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get audit trail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit trail'
    });
  }
});

/**
 * Get active risk alerts
 */
router.get('/alerts/active', authenticateToken, rbac(['admin', 'trader', 'analyst']), async (req, res) => {
  try {
    const { portfolioId, severity } = req.query;

    let alerts = await riskEngine.getActiveAlerts(portfolioId);

    // Filter by severity if specified
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    // Group alerts by severity
    const alertsBySeverity = {
      critical: alerts.filter(a => a.severity === 'critical').length,
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length
    };

    res.json({
      success: true,
      data: {
        alerts,
        totalAlerts: alerts.length,
        alertsBySeverity,
        portfolioId: portfolioId || 'all'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get active alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve active alerts'
    });
  }
});

/**
 * Resolve risk alert
 */
router.put('/alerts/:alertId/resolve', authenticateToken, rbac(['admin', 'trader']), async (req, res) => {
  try {
    const { alertId } = req.params;
    const { reason } = req.body;

    // Update alert as resolved
    const query = `
      UPDATE risk_alerts 
      SET resolved = TRUE, resolved_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;

    await new Promise((resolve, reject) => {
      const { db } = require('../database/init');
      db.run(query, [alertId], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });

    // Audit the resolution
    await riskEngine.auditRiskDecision({
      user_id: req.user.id,
      portfolio_id: null,
      action_type: 'ALERT_RESOLUTION',
      risk_type: 'ALERT_MANAGEMENT',
      decision: 'RESOLVED',
      reason: reason || 'Alert manually resolved',
      metadata: JSON.stringify({ alertId }),
      severity: 'low'
    });

    logger.info('Risk alert resolved', {
      alertId,
      userId: req.user.id,
      reason
    });

    res.json({
      success: true,
      message: 'Alert resolved successfully',
      alertId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to resolve alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert'
    });
  }
});

/**
 * Get risk limits for portfolio
 */
router.get('/limits/:portfolioId', authenticateToken, rbac(['admin', 'trader']), async (req, res) => {
  try {
    const { portfolioId } = req.params;

    // Get custom limits from database
    const query = `
      SELECT risk_limits, updated_at, updated_by 
      FROM portfolio_risk_limits 
      WHERE portfolio_id = ?
    `;

    const customLimits = await new Promise((resolve, reject) => {
      const { db } = require('../database/init');
      db.get(query, [portfolioId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const limits = customLimits ? 
      JSON.parse(customLimits.risk_limits) : 
      riskEngine.riskLimits;

    res.json({
      success: true,
      data: {
        portfolioId,
        riskLimits: limits,
        isCustom: !!customLimits,
        lastUpdated: customLimits?.updated_at,
        updatedBy: customLimits?.updated_by
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get risk limits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve risk limits'
    });
  }
});

/**
 * Update risk limits for portfolio
 */
router.put('/limits/:portfolioId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { riskLimits } = req.body;

    if (!riskLimits || typeof riskLimits !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'riskLimits object is required'
      });
    }

    await riskEngine.updateRiskLimits(portfolioId, riskLimits, req.user.id);

    logger.info('Risk limits updated', {
      portfolioId,
      userId: req.user.id,
      limits: Object.keys(riskLimits)
    });

    res.json({
      success: true,
      message: 'Risk limits updated successfully',
      portfolioId,
      updatedLimits: Object.keys(riskLimits).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to update risk limits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update risk limits'
    });
  }
});

/**
 * Get risk metrics summary
 */
router.get('/metrics/summary', authenticateToken, rbac(['admin', 'trader', 'analyst']), async (req, res) => {
  try {
    const { portfolioId, timeframe = '24h' } = req.query;

    // Calculate timeframe
    const hoursBack = {
      '1h': 1,
      '4h': 4,
      '24h': 24,
      '7d': 168,
      '30d': 720
    }[timeframe] || 24;

    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

    // Get risk metrics from database
    let query = `
      SELECT metric_type, AVG(metric_value) as avg_value, MAX(metric_value) as max_value,
             MIN(metric_value) as min_value, COUNT(*) as data_points
      FROM risk_metrics_history 
      WHERE timestamp > ?
    `;
    
    const params = [since];
    
    if (portfolioId) {
      query += ` AND portfolio_id = ?`;
      params.push(portfolioId);
    }
    
    query += ` GROUP BY metric_type`;

    const metrics = await new Promise((resolve, reject) => {
      const { db } = require('../database/init');
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get recent alerts count
    const alertsQuery = `
      SELECT COUNT(*) as total_alerts, severity
      FROM risk_alerts 
      WHERE timestamp > ? ${portfolioId ? 'AND portfolio_id = ?' : ''}
      GROUP BY severity
    `;

    const alertParams = portfolioId ? [since, portfolioId] : [since];
    const alertCounts = await new Promise((resolve, reject) => {
      const { db } = require('../database/init');
      db.all(alertsQuery, alertParams, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const summary = {
      timeframe,
      portfolioId: portfolioId || 'all',
      riskMetrics: {},
      alertCounts: {}
    };

    // Process metrics
    metrics.forEach(metric => {
      summary.riskMetrics[metric.metric_type] = {
        average: metric.avg_value,
        maximum: metric.max_value,
        minimum: metric.min_value,
        dataPoints: metric.data_points
      };
    });

    // Process alert counts
    alertCounts.forEach(alert => {
      summary.alertCounts[alert.severity] = alert.total_alerts;
    });

    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get risk metrics summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve risk metrics summary'
    });
  }
});

/**
 * Generate risk report
 */
router.post('/reports/generate', authenticateToken, rbac(['admin', 'analyst']), async (req, res) => {
  try {
    const { reportType = 'daily', portfolioId, includeAudit = false } = req.body;

    const report = await riskEngine.generateDailyRiskReport();
    
    if (includeAudit && reportType === 'detailed') {
      report.auditSummary = await riskEngine.getAuditTrail(portfolioId, 50);
      report.activeAlerts = await riskEngine.getActiveAlerts(portfolioId);
    }

    res.json({
      success: true,
      data: {
        reportType,
        portfolioId: portfolioId || 'all',
        report,
        generatedAt: new Date().toISOString(),
        generatedBy: req.user.id
      }
    });

  } catch (error) {
    logger.error('Failed to generate risk report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate risk report'
    });
  }
});

/**
 * Test risk engine status
 */
router.get('/status', authenticateToken, rbac(['admin', 'trader']), async (req, res) => {
  try {
    const status = {
      engineStatus: 'operational',
      version: '1.0.0',
      uptime: process.uptime(),
      riskLimitsCount: Object.keys(riskEngine.riskLimits).length,
      activeAlertsCount: riskEngine.riskAlerts.filter(a => !a.resolved).length,
      auditTrailSize: riskEngine.auditTrail.length,
      lastCheck: new Date().toISOString(),
      enforcementActive: true,
      monitoringActive: true
    };

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get risk engine status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve risk engine status'
    });
  }
});

module.exports = router;