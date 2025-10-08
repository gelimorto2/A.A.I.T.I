const express = require('express');
const router = express.Router();
const RiskController = require('../controllers/riskController');
const auth = require('../middleware/enhancedAuth');
const rateLimit = require('express-rate-limit');

// Initialize controller (will be set when router is used)
let riskController;

/**
 * Rate limiting for risk management endpoints
 */
const riskRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many risk management requests',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @route   GET /api/risk/status
 * @desc    Get current risk status and metrics
 * @access  Private
 */
router.get('/status', auth, riskRateLimit, async (req, res) => {
  await riskController.getRiskStatus(req, res);
});

/**
 * @route   POST /api/risk/evaluate
 * @desc    Evaluate trade risk before execution
 * @access  Private
 * @body    {
 *   botId: string,
 *   symbol: string,
 *   side: 'buy' | 'sell',
 *   quantity: number,
 *   price: number,
 *   metadata?: object
 * }
 */
router.post('/evaluate', auth, riskRateLimit, async (req, res) => {
  await riskController.evaluateTradeRisk(req, res);
});

/**
 * @route   GET /api/risk/config
 * @desc    Get risk management configuration
 * @access  Private
 */
router.get('/config', auth, async (req, res) => {
  await riskController.getRiskConfiguration(req, res);
});

/**
 * @route   PUT /api/risk/config
 * @desc    Update risk management configuration
 * @access  Private (Admin only)
 * @body    Risk configuration updates
 */
router.put('/config', auth, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Admin privileges required to update risk configuration'
    });
  }
  
  await riskController.updateRiskConfiguration(req, res);
});

/**
 * @route   GET /api/risk/portfolio
 * @desc    Get detailed portfolio risk analysis
 * @access  Private
 */
router.get('/portfolio', auth, async (req, res) => {
  await riskController.getPortfolioRiskAnalysis(req, res);
});

/**
 * @route   GET /api/risk/alerts
 * @desc    Get current risk alerts and warnings
 * @access  Private
 */
router.get('/alerts', auth, riskRateLimit, async (req, res) => {
  await riskController.getRiskAlerts(req, res);
});

/**
 * @route   GET /api/risk/health
 * @desc    Risk management system health check
 * @access  Private
 */
router.get('/health', auth, async (req, res) => {
  try {
    const riskStatus = riskController.riskManager.getRiskStatus();
    const lastUpdate = riskStatus.lastUpdate;
    const isHealthy = Date.now() - lastUpdate < 2 * 60 * 1000; // 2 minutes
    
    res.status(isHealthy ? 200 : 503).json({
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'degraded',
        lastUpdate,
        timeSinceLastUpdate: Date.now() - lastUpdate,
        riskManagerActive: !!riskController.riskManager,
        portfolioValue: riskStatus.portfolioState.portfolioValue,
        monitoringActive: isHealthy
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Risk management system unavailable',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/risk/metrics/historical
 * @desc    Get historical risk metrics
 * @access  Private
 * @query   {
 *   period?: string ('1d', '7d', '30d', '90d'),
 *   metric?: string ('drawdown', 'var', 'sharpe', 'volatility')
 * }
 */
router.get('/metrics/historical', auth, async (req, res) => {
  try {
    const { period = '30d', metric } = req.query;
    
    // This would typically fetch historical data from database
    // For now, return mock historical data
    const mockHistoricalData = {
      period,
      requestedMetric: metric,
      data: [
        { date: '2025-09-01', drawdown: 0.02, var95: 0.045, sharpeRatio: 1.2, volatility: 0.15 },
        { date: '2025-09-02', drawdown: 0.018, var95: 0.043, sharpeRatio: 1.25, volatility: 0.14 },
        { date: '2025-09-03', drawdown: 0.025, var95: 0.048, sharpeRatio: 1.18, volatility: 0.16 }
      ],
      summary: {
        avgDrawdown: 0.021,
        maxDrawdown: 0.025,
        avgVar95: 0.045,
        avgSharpeRatio: 1.21,
        avgVolatility: 0.15
      }
    };

    res.status(200).json({
      success: true,
      data: mockHistoricalData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve historical risk metrics',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/risk/simulate
 * @desc    Simulate portfolio risk under different scenarios
 * @access  Private
 * @body    {
 *   scenario: 'market_crash' | 'high_volatility' | 'correlation_increase' | 'custom',
 *   parameters?: object
 * }
 */
router.post('/simulate', auth, async (req, res) => {
  try {
    const { scenario, parameters = {} } = req.body;
    
    if (!scenario) {
      return res.status(400).json({
        success: false,
        error: 'Missing scenario parameter',
        validScenarios: ['market_crash', 'high_volatility', 'correlation_increase', 'custom']
      });
    }

    // Mock risk simulation
    const simulationResults = {
      scenario,
      parameters,
      results: {
        estimatedLoss: 0.08,
        var95: 0.12,
        expectedShortfall: 0.15,
        affectedPositions: 12,
        recommendedActions: [
          'Reduce position sizes by 25%',
          'Increase cash reserves',
          'Consider hedging major positions'
        ],
        timeToRecover: '15-30 days'
      },
      confidence: 0.85
    };

    res.status(200).json({
      success: true,
      data: simulationResults,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Risk simulation failed',
      message: error.message
    });
  }
});

/**
 * Initialize router with risk controller
 */
function initializeRiskRoutes(riskManagerInstance) {
  riskController = new RiskController(riskManagerInstance);
  return router;
}

module.exports = { router, initializeRiskRoutes };