const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const AdvancedAnalyticsService = require('../utils/advancedAnalyticsService');
const RiskManagementSystem = require('../utils/riskManagement');

const router = express.Router();

// Initialize services
const analyticsService = new AdvancedAnalyticsService();
const riskManager = new RiskManagementSystem();

/**
 * Advanced Analytics & Reporting API Routes (TODO 2.2)
 * Comprehensive performance analytics, attribution analysis, and benchmarking
 */

/**
 * Get service status and capabilities
 */
router.get('/status', authenticateToken, (req, res) => {
  try {
    const status = analyticsService.getServiceStatus();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      status
    });
  } catch (error) {
    logger.error('Error getting advanced analytics status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service status',
      message: error.message
    });
  }
});

/**
 * Performance Attribution Analysis
 */
router.get('/attribution/:portfolioId', authenticateToken, async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { startDate, endDate, level = 'all' } = req.query;
    
    // Verify portfolio belongs to user
    const portfolio = await verifyPortfolioOwnership(portfolioId, req.user.id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found or access denied'
      });
    }
    
    // Register portfolio if not already registered
    await ensurePortfolioRegistered(portfolioId, req.user.id);
    
    const attribution = await analyticsService.calculateAttributionAnalysis(
      portfolioId,
      startDate || getDefaultStartDate(),
      endDate || new Date().toISOString().split('T')[0],
      { level }
    );
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      attribution
    });
    
  } catch (error) {
    logger.error('Error calculating attribution analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate attribution analysis',
      message: error.message
    });
  }
});

/**
 * Risk-Adjusted Performance Metrics
 */
router.get('/risk-adjusted/:portfolioId', authenticateToken, async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { benchmark = 'SPY', period = 252, riskFreeRate = 0.02 } = req.query;
    
    const portfolio = await verifyPortfolioOwnership(portfolioId, req.user.id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found or access denied'
      });
    }
    
    await ensurePortfolioRegistered(portfolioId, req.user.id);
    
    const metrics = await analyticsService.calculateRiskAdjustedMetrics(
      portfolioId,
      benchmark,
      { period: parseInt(period), riskFreeRate: parseFloat(riskFreeRate) }
    );
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics
    });
    
  } catch (error) {
    logger.error('Error calculating risk-adjusted metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate risk-adjusted metrics',
      message: error.message
    });
  }
});

/**
 * Benchmark Comparison Analysis
 */
router.get('/benchmark-comparison/:portfolioId', authenticateToken, async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { benchmarks, period = 252 } = req.query;
    
    const portfolio = await verifyPortfolioOwnership(portfolioId, req.user.id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found or access denied'
      });
    }
    
    await ensurePortfolioRegistered(portfolioId, req.user.id);
    
    const benchmarkList = benchmarks ? benchmarks.split(',') : ['SPY', 'QQQ', 'BTC'];
    const comparison = await analyticsService.compareToBenchmarks(
      portfolioId,
      benchmarkList,
      { period: parseInt(period) }
    );
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      comparison
    });
    
  } catch (error) {
    logger.error('Error performing benchmark comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform benchmark comparison',
      message: error.message
    });
  }
});

/**
 * Generate Custom Performance Report
 */
router.post('/reports/:portfolioId', authenticateToken, async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { reportType = 'comprehensive', options = {} } = req.body;
    
    const portfolio = await verifyPortfolioOwnership(portfolioId, req.user.id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found or access denied'
      });
    }
    
    await ensurePortfolioRegistered(portfolioId, req.user.id);
    
    // Set default date range if not provided
    if (!options.startDate) {
      options.startDate = getDefaultStartDate();
    }
    if (!options.endDate) {
      options.endDate = new Date().toISOString().split('T')[0];
    }
    
    const report = await analyticsService.generatePerformanceReport(
      portfolioId,
      reportType,
      options
    );
    
    // Save report metadata to database
    await saveReportMetadata(report, req.user.id);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      report
    });
    
  } catch (error) {
    logger.error('Error generating performance report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate performance report',
      message: error.message
    });
  }
});

/**
 * Get Generated Reports List
 */
router.get('/reports', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, portfolioId } = req.query;
    
    let query = `
      SELECT r.*, p.name as portfolio_name
      FROM advanced_reports r
      LEFT JOIN bots p ON r.portfolio_id = p.id
      WHERE r.user_id = ?
    `;
    const params = [req.user.id];
    
    if (portfolioId) {
      query += ' AND r.portfolio_id = ?';
      params.push(portfolioId);
    }
    
    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(query, params, (err, reports) => {
      if (err) {
        logger.error('Error fetching reports:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch reports'
        });
      }
      
      const formattedReports = reports.map(report => ({
        id: report.id,
        portfolioId: report.portfolio_id,
        portfolioName: report.portfolio_name,
        type: report.type,
        status: report.status,
        createdAt: report.created_at,
        metadata: JSON.parse(report.metadata || '{}')
      }));
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        reports: formattedReports,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: formattedReports.length
        }
      });
    });
    
  } catch (error) {
    logger.error('Error fetching reports list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports list',
      message: error.message
    });
  }
});

/**
 * Get Specific Report
 */
router.get('/reports/:reportId', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    
    db.get(
      'SELECT * FROM advanced_reports WHERE id = ? AND user_id = ?',
      [reportId, req.user.id],
      (err, report) => {
        if (err) {
          logger.error('Error fetching report:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch report'
          });
        }
        
        if (!report) {
          return res.status(404).json({
            success: false,
            error: 'Report not found'
          });
        }
        
        const formattedReport = {
          id: report.id,
          portfolioId: report.portfolio_id,
          type: report.type,
          status: report.status,
          createdAt: report.created_at,
          metadata: JSON.parse(report.metadata || '{}'),
          data: JSON.parse(report.data || '{}')
        };
        
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          report: formattedReport
        });
      }
    );
    
  } catch (error) {
    logger.error('Error fetching specific report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch report',
      message: error.message
    });
  }
});

/**
 * Real-Time Risk Monitoring
 */
router.get('/risk-monitoring/:portfolioId', authenticateToken, async (req, res) => {
  try {
    const { portfolioId } = req.params;
    
    const portfolio = await verifyPortfolioOwnership(portfolioId, req.user.id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found or access denied'
      });
    }
    
    await ensurePortfolioRegistered(portfolioId, req.user.id);
    
    const riskCheck = await riskManager.performRealTimeRiskCheck(portfolioId);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      riskCheck
    });
    
  } catch (error) {
    logger.error('Error performing real-time risk monitoring:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform risk monitoring',
      message: error.message
    });
  }
});

/**
 * VaR Analysis with Multiple Methods
 */
router.get('/var-analysis/:portfolioId', authenticateToken, async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { confidence = 0.95, horizon = 1, methods = 'all' } = req.query;
    
    const portfolio = await verifyPortfolioOwnership(portfolioId, req.user.id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found or access denied'
      });
    }
    
    await ensurePortfolioRegistered(portfolioId, req.user.id);
    
    const conf = parseFloat(confidence);
    const hor = parseInt(horizon);
    const methodList = methods === 'all' ? ['historical', 'parametric', 'monte_carlo'] : methods.split(',');
    
    const varAnalysis = {};
    for (const method of methodList) {
      varAnalysis[method] = await riskManager.calculateVaR(portfolioId, conf, hor, method);
    }
    
    // Calculate Expected Shortfall
    const expectedShortfall = await riskManager.calculateExpectedShortfall(portfolioId, conf, hor);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      varAnalysis,
      expectedShortfall,
      summary: {
        confidence: conf,
        horizon: hor,
        methods: methodList,
        avgVaR: Object.values(varAnalysis).reduce((sum, var_) => sum + var_.varAmount, 0) / methodList.length
      }
    });
    
  } catch (error) {
    logger.error('Error performing VaR analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform VaR analysis',
      message: error.message
    });
  }
});

/**
 * Position Sizing Recommendations
 */
router.post('/position-sizing/:portfolioId', authenticateToken, async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { symbol, method = 'kelly_criterion', parameters = {} } = req.body;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required'
      });
    }
    
    const portfolio = await verifyPortfolioOwnership(portfolioId, req.user.id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found or access denied'
      });
    }
    
    await ensurePortfolioRegistered(portfolioId, req.user.id);
    
    const sizing = riskManager.calculatePositionSize(portfolioId, symbol, method, parameters);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      sizing
    });
    
  } catch (error) {
    logger.error('Error calculating position sizing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate position sizing',
      message: error.message
    });
  }
});

/**
 * Stress Testing
 */
router.post('/stress-test/:portfolioId', authenticateToken, async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { scenarios, options = {} } = req.body;
    
    const portfolio = await verifyPortfolioOwnership(portfolioId, req.user.id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found or access denied'
      });
    }
    
    await ensurePortfolioRegistered(portfolioId, req.user.id);
    
    // Use the performStressTest method from analyticsService
    const stressTest = await analyticsService.performStressTest(portfolioId, options);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      stressTest
    });
    
  } catch (error) {
    logger.error('Error performing stress test:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform stress test',
      message: error.message
    });
  }
});

/**
 * Correlation Analysis
 */
router.get('/correlation/:portfolioId', authenticateToken, async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { newSymbol } = req.query;
    
    const portfolio = await verifyPortfolioOwnership(portfolioId, req.user.id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found or access denied'
      });
    }
    
    await ensurePortfolioRegistered(portfolioId, req.user.id);
    
    const correlationAnalysis = await riskManager.calculateCorrelationRisk(portfolioId, newSymbol);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      correlationAnalysis
    });
    
  } catch (error) {
    logger.error('Error performing correlation analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform correlation analysis',
      message: error.message
    });
  }
});

/**
 * Available Methods and Capabilities
 */
router.get('/methods', authenticateToken, (req, res) => {
  try {
    const methods = {
      positionSizing: riskManager.getPositionSizingMethods(),
      varMethods: ['historical', 'parametric', 'monte_carlo'],
      reportTypes: ['comprehensive', 'risk_focused', 'attribution', 'benchmark', 'executive_summary'],
      benchmarks: ['SPY', 'QQQ', 'BTC', 'ETH', 'VTI', 'VWO'],
      riskMetrics: [
        'sharpeRatio', 'sortinoRatio', 'calmarRatio', 'informationRatio',
        'alpha', 'beta', 'treynorRatio', 'jensensAlpha', 'maxDrawdown',
        'downsideDeviation', 'valueAtRisk', 'conditionalVaR', 'trackingError'
      ]
    };
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      methods
    });
    
  } catch (error) {
    logger.error('Error fetching available methods:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available methods',
      message: error.message
    });
  }
});

/**
 * Helper Functions
 */
async function verifyPortfolioOwnership(portfolioId, userId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id, name, trading_mode FROM bots WHERE id = ? AND user_id = ?',
      [portfolioId, userId],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      }
    );
  });
}

async function ensurePortfolioRegistered(portfolioId, userId) {
  try {
    // Check if portfolio is already registered with risk manager
    let portfolio = riskManager.getPortfolio(portfolioId);
    
    if (!portfolio) {
      // Fetch portfolio data from database
      const portfolioData = await getPortfolioData(portfolioId, userId);
      
      // Register with risk manager
      riskManager.registerPortfolio(portfolioId, {
        cash: portfolioData.cash || 10000,
        leverage: portfolioData.leverage || 1.0,
        riskLimits: portfolioData.riskLimits || {}
      });
      
      // Update positions if available
      if (portfolioData.positions && portfolioData.positions.length > 0) {
        riskManager.updatePortfolioPositions(portfolioId, portfolioData.positions);
      }
    }
  } catch (error) {
    logger.warn(`Could not register portfolio ${portfolioId}:`, error);
    // Continue without registration - many functions will still work
  }
}

async function getPortfolioData(portfolioId, userId) {
  return new Promise((resolve, reject) => {
    // Get portfolio basic info
    db.get(
      'SELECT * FROM bots WHERE id = ? AND user_id = ?',
      [portfolioId, userId],
      (err, bot) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Get current positions
        db.all(
          `SELECT 
            t.symbol,
            SUM(CASE WHEN t.type = 'buy' THEN t.quantity ELSE -t.quantity END) as quantity,
            AVG(t.entry_price) as avgPrice,
            MAX(t.entry_price) as currentPrice
          FROM trades t 
          WHERE t.bot_id = ? AND t.status = 'open'
          GROUP BY t.symbol
          HAVING quantity > 0`,
          [portfolioId],
          (err, positions) => {
            if (err) {
              reject(err);
              return;
            }
            
            const formattedPositions = (positions || []).map(pos => ({
              symbol: pos.symbol,
              quantity: pos.quantity,
              avgPrice: pos.avgPrice,
              currentPrice: pos.currentPrice, // In real implementation, fetch current market price
              sector: 'Unknown' // Would be fetched from market data service
            }));
            
            resolve({
              id: portfolioId,
              name: bot?.name || `Portfolio ${portfolioId}`,
              cash: 10000, // Mock value - would be calculated from actual cash balance
              leverage: 1.0,
              positions: formattedPositions,
              riskLimits: {}
            });
          }
        );
      }
    );
  });
}

async function saveReportMetadata(report, userId) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO advanced_reports (id, user_id, portfolio_id, type, status, metadata, data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;
    
    db.run(query, [
      report.id,
      userId,
      report.portfolioId,
      report.type,
      'completed',
      JSON.stringify({
        period: report.period,
        pdf: report.pdf
      }),
      JSON.stringify(report.sections)
    ], function(err) {
      if (err) {
        logger.warn('Could not save report metadata:', err);
        // Don't reject - report generation succeeded
      }
      resolve();
    });
  });
}

function getDefaultStartDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1); // 1 year ago
  return date.toISOString().split('T')[0];
}

module.exports = router;