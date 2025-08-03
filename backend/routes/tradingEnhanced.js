const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/init');
const { authenticateToken, auditLog } = require('../middleware/auth');
const marketDataService = require('../utils/marketData');
const ExchangeAbstraction = require('../utils/exchangeAbstraction');
const AdvancedOrderManager = require('../utils/advancedOrderManager');
const RiskManagementSystem = require('../utils/riskManagement');
const logger = require('../utils/logger');

const router = express.Router();

// Initialize enhanced trading systems
const exchangeAbstraction = new ExchangeAbstraction();
const advancedOrderManager = new AdvancedOrderManager(exchangeAbstraction);
const riskManagement = new RiskManagementSystem();

// Register default exchanges
try {
  exchangeAbstraction.registerExchange('binance_main', 'binance', {
    apiKey: process.env.BINANCE_API_KEY || 'demo_key',
    apiSecret: process.env.BINANCE_API_SECRET || 'demo_secret',
    testnet: !process.env.BINANCE_API_KEY
  });

  exchangeAbstraction.registerExchange('coinbase_main', 'coinbase', {
    apiKey: process.env.COINBASE_API_KEY || 'demo_key',
    apiSecret: process.env.COINBASE_API_SECRET || 'demo_secret',
    passphrase: process.env.COINBASE_PASSPHRASE || 'demo_passphrase',
    sandbox: !process.env.COINBASE_API_KEY
  });

  exchangeAbstraction.registerExchange('alpha_vantage', 'alpha_vantage', {
    apiKey: process.env.ALPHA_VANTAGE_API_KEY || 'demo'
  });

  logger.info('Enhanced Trading Engine initialized with multi-exchange support');
} catch (error) {
  logger.error('Error initializing exchanges:', error);
}

// ===== MULTI-EXCHANGE SUPPORT =====

// List available exchanges
router.get('/exchanges', authenticateToken, (req, res) => {
  try {
    const exchanges = exchangeAbstraction.listExchanges();
    res.json({
      exchanges,
      supportedTypes: Object.values(exchangeAbstraction.supportedExchanges),
      totalExchanges: exchanges.length
    });
  } catch (error) {
    logger.error('Error listing exchanges:', error);
    res.status(500).json({ error: 'Failed to list exchanges' });
  }
});

// Register new exchange
router.post('/exchanges', authenticateToken, auditLog('register_exchange', 'exchange'), (req, res) => {
  try {
    const { name, type, credentials } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ error: 'Exchange name and type are required' });
    }

    const exchangeId = exchangeAbstraction.registerExchange(name, type, credentials || {});
    
    res.json({
      message: 'Exchange registered successfully',
      exchangeId,
      type,
      name
    });
  } catch (error) {
    logger.error('Error registering exchange:', error);
    res.status(500).json({ error: 'Failed to register exchange' });
  }
});

// Test exchange connection
router.post('/exchanges/:exchangeId/test', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const result = await exchangeAbstraction.testConnection(exchangeId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error testing exchange connection:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

// Get exchange market data
router.get('/exchanges/:exchangeId/market-data/:symbol', authenticateToken, async (req, res) => {
  try {
    const { exchangeId, symbol } = req.params;
    const { timeframe = '1h', limit = 100 } = req.query;
    
    const data = await exchangeAbstraction.getMarketData(exchangeId, symbol, timeframe, parseInt(limit));
    
    res.json(data);
  } catch (error) {
    logger.error('Error getting exchange market data:', error);
    res.status(500).json({ error: 'Failed to get market data' });
  }
});

// Get exchange quote
router.get('/exchanges/:exchangeId/quote/:symbol', authenticateToken, async (req, res) => {
  try {
    const { exchangeId, symbol } = req.params;
    const quote = await exchangeAbstraction.getQuote(exchangeId, symbol);
    
    res.json(quote);
  } catch (error) {
    logger.error('Error getting exchange quote:', error);
    res.status(500).json({ error: 'Failed to get quote' });
  }
});

// Cross-exchange arbitrage detection
router.get('/arbitrage', authenticateToken, async (req, res) => {
  try {
    const { symbols, minProfit = 0.5 } = req.query;
    const symbolsArray = symbols ? symbols.split(',') : ['BTC', 'ETH', 'ADA'];
    
    const opportunities = await exchangeAbstraction.detectArbitrageOpportunities(
      symbolsArray,
      parseFloat(minProfit)
    );
    
    res.json({
      opportunities,
      symbols: symbolsArray,
      minProfitPercent: parseFloat(minProfit),
      totalOpportunities: opportunities.length
    });
  } catch (error) {
    logger.error('Error detecting arbitrage opportunities:', error);
    res.status(500).json({ error: 'Failed to detect arbitrage opportunities' });
  }
});

// Get best execution venue
router.post('/best-venue', authenticateToken, async (req, res) => {
  try {
    const { symbol, side, quantity } = req.body;
    
    if (!symbol || !side || !quantity) {
      return res.status(400).json({ error: 'Symbol, side, and quantity are required' });
    }

    const bestVenue = await exchangeAbstraction.getBestExecutionVenue(symbol, side, quantity);
    
    res.json(bestVenue);
  } catch (error) {
    logger.error('Error finding best execution venue:', error);
    res.status(500).json({ error: 'Failed to find best venue' });
  }
});

// ===== ADVANCED ORDER MANAGEMENT =====

// Get available order types
router.get('/order-types', authenticateToken, (req, res) => {
  try {
    const orderTypes = advancedOrderManager.getOrderTypes();
    const executionStrategies = advancedOrderManager.getExecutionStrategies();
    
    res.json({
      orderTypes,
      executionStrategies,
      totalTypes: orderTypes.length
    });
  } catch (error) {
    logger.error('Error getting order types:', error);
    res.status(500).json({ error: 'Failed to get order types' });
  }
});

// Place advanced order
router.post('/orders/advanced', authenticateToken, auditLog('advanced_order', 'order'), async (req, res) => {
  try {
    const orderParams = req.body;
    
    // Add user context
    orderParams.userId = req.user.id;
    
    // Validate required fields based on order type
    const requiredFields = ['symbol', 'side', 'type', 'quantity'];
    for (const field of requiredFields) {
      if (!orderParams[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    const result = await advancedOrderManager.placeAdvancedOrder(orderParams);
    
    res.json({
      message: 'Advanced order placed successfully',
      ...result
    });
  } catch (error) {
    logger.error('Error placing advanced order:', error);
    res.status(500).json({ error: error.message || 'Failed to place advanced order' });
  }
});

// Get order status
router.get('/orders/:orderId', authenticateToken, (req, res) => {
  try {
    const { orderId } = req.params;
    const order = advancedOrderManager.getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    logger.error('Error getting order status:', error);
    res.status(500).json({ error: 'Failed to get order status' });
  }
});

// Cancel order
router.delete('/orders/:orderId', authenticateToken, auditLog('cancel_order', 'order'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await advancedOrderManager.cancelOrder(orderId);
    
    res.json({
      message: 'Order cancelled successfully',
      ...result
    });
  } catch (error) {
    logger.error('Error cancelling order:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel order' });
  }
});

// List active orders
router.get('/orders', authenticateToken, (req, res) => {
  try {
    const filters = {
      symbol: req.query.symbol,
      type: req.query.type,
      exchangeId: req.query.exchangeId
    };

    const orders = advancedOrderManager.listActiveOrders(filters);
    
    res.json({
      orders,
      totalOrders: orders.length,
      filters: Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
    });
  } catch (error) {
    logger.error('Error listing orders:', error);
    res.status(500).json({ error: 'Failed to list orders' });
  }
});

// Get order execution analytics
router.get('/analytics/execution', authenticateToken, (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    const analytics = advancedOrderManager.getExecutionAnalytics(timeframe);
    
    res.json({
      ...analytics,
      timeframe
    });
  } catch (error) {
    logger.error('Error getting execution analytics:', error);
    res.status(500).json({ error: 'Failed to get execution analytics' });
  }
});

// ===== RISK MANAGEMENT SYSTEM =====

// Register portfolio for risk monitoring
router.post('/risk/portfolios', authenticateToken, auditLog('register_portfolio', 'risk'), (req, res) => {
  try {
    const { portfolioId, portfolioData } = req.body;
    
    if (!portfolioId) {
      return res.status(400).json({ error: 'Portfolio ID is required' });
    }

    const id = riskManagement.registerPortfolio(portfolioId, {
      userId: req.user.id,
      ...portfolioData
    });
    
    res.json({
      message: 'Portfolio registered for risk monitoring',
      portfolioId: id
    });
  } catch (error) {
    logger.error('Error registering portfolio:', error);
    res.status(500).json({ error: 'Failed to register portfolio' });
  }
});

// Update portfolio positions
router.put('/risk/portfolios/:portfolioId/positions', authenticateToken, auditLog('update_positions', 'risk'), (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { positions } = req.body;
    
    if (!Array.isArray(positions)) {
      return res.status(400).json({ error: 'Positions must be an array' });
    }

    riskManagement.updatePortfolioPositions(portfolioId, positions);
    
    res.json({
      message: 'Portfolio positions updated successfully',
      portfolioId,
      positionsCount: positions.length
    });
  } catch (error) {
    logger.error('Error updating portfolio positions:', error);
    res.status(500).json({ error: error.message || 'Failed to update positions' });
  }
});

// Calculate position size
router.post('/risk/position-size', authenticateToken, async (req, res) => {
  try {
    const { portfolioId, symbol, method = 'fixed_percentage', parameters = {} } = req.body;
    
    if (!portfolioId || !symbol) {
      return res.status(400).json({ error: 'Portfolio ID and symbol are required' });
    }

    const result = riskManagement.calculatePositionSize(portfolioId, symbol, method, parameters);
    
    res.json({
      symbol,
      portfolioId,
      ...result
    });
  } catch (error) {
    logger.error('Error calculating position size:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate position size' });
  }
});

// Calculate Value at Risk (VaR)
router.post('/risk/var', authenticateToken, async (req, res) => {
  try {
    const { portfolioId, confidence = 0.95, horizon = 1, method = 'parametric' } = req.body;
    
    if (!portfolioId) {
      return res.status(400).json({ error: 'Portfolio ID is required' });
    }

    const varResult = await riskManagement.calculateVaR(portfolioId, confidence, horizon, method);
    
    res.json(varResult);
  } catch (error) {
    logger.error('Error calculating VaR:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate VaR' });
  }
});

// Calculate Expected Shortfall
router.post('/risk/expected-shortfall', authenticateToken, async (req, res) => {
  try {
    const { portfolioId, confidence = 0.95, horizon = 1 } = req.body;
    
    if (!portfolioId) {
      return res.status(400).json({ error: 'Portfolio ID is required' });
    }

    const esResult = await riskManagement.calculateExpectedShortfall(portfolioId, confidence, horizon);
    
    res.json(esResult);
  } catch (error) {
    logger.error('Error calculating Expected Shortfall:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate Expected Shortfall' });
  }
});

// Calculate maximum drawdown protection
router.get('/risk/portfolios/:portfolioId/drawdown', authenticateToken, (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { maxDrawdown } = req.query;
    
    const result = riskManagement.calculateMaxDrawdownProtection(
      portfolioId, 
      maxDrawdown ? parseFloat(maxDrawdown) : null
    );
    
    res.json(result);
  } catch (error) {
    logger.error('Error calculating drawdown protection:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate drawdown protection' });
  }
});

// Calculate correlation risk
router.get('/risk/portfolios/:portfolioId/correlation', authenticateToken, async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { newSymbol } = req.query;
    
    const result = await riskManagement.calculateCorrelationRisk(portfolioId, newSymbol);
    
    res.json(result);
  } catch (error) {
    logger.error('Error calculating correlation risk:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate correlation risk' });
  }
});

// Real-time risk check
router.get('/risk/portfolios/:portfolioId/check', authenticateToken, async (req, res) => {
  try {
    const { portfolioId } = req.params;
    
    const riskChecks = await riskManagement.performRealTimeRiskCheck(portfolioId);
    
    res.json(riskChecks);
  } catch (error) {
    logger.error('Error performing risk check:', error);
    res.status(500).json({ error: error.message || 'Failed to perform risk check' });
  }
});

// Generate comprehensive risk report
router.get('/risk/portfolios/:portfolioId/report', authenticateToken, async (req, res) => {
  try {
    const { portfolioId } = req.params;
    
    const report = await riskManagement.generateRiskReport(portfolioId);
    
    res.json(report);
  } catch (error) {
    logger.error('Error generating risk report:', error);
    res.status(500).json({ error: error.message || 'Failed to generate risk report' });
  }
});

// Get recent risk alerts
router.get('/risk/alerts', authenticateToken, (req, res) => {
  try {
    const { portfolioId, limit = 10 } = req.query;
    
    const alerts = riskManagement.getRecentAlerts(portfolioId, parseInt(limit));
    
    res.json({
      alerts,
      totalAlerts: alerts.length,
      portfolioId: portfolioId || 'all'
    });
  } catch (error) {
    logger.error('Error getting risk alerts:', error);
    res.status(500).json({ error: 'Failed to get risk alerts' });
  }
});

// Get position sizing methods
router.get('/risk/position-sizing-methods', authenticateToken, (req, res) => {
  try {
    const methods = riskManagement.getPositionSizingMethods();
    
    res.json({
      methods,
      totalMethods: methods.length
    });
  } catch (error) {
    logger.error('Error getting position sizing methods:', error);
    res.status(500).json({ error: 'Failed to get position sizing methods' });
  }
});

// List portfolios
router.get('/risk/portfolios', authenticateToken, (req, res) => {
  try {
    const portfolios = riskManagement.listPortfolios();
    
    res.json({
      portfolios,
      totalPortfolios: portfolios.length
    });
  } catch (error) {
    logger.error('Error listing portfolios:', error);
    res.status(500).json({ error: 'Failed to list portfolios' });
  }
});

// ===== ENHANCED TRADING FEATURES =====

// Smart order routing
router.post('/smart-route', authenticateToken, auditLog('smart_route', 'order'), async (req, res) => {
  try {
    const { symbol, side, quantity, strategy = 'best_execution' } = req.body;
    
    if (!symbol || !side || !quantity) {
      return res.status(400).json({ error: 'Symbol, side, and quantity are required' });
    }

    // Get best venue
    const venue = await exchangeAbstraction.getBestExecutionVenue(symbol, side, quantity);
    
    // Place order using advanced order manager
    const orderResult = await advancedOrderManager.placeAdvancedOrder({
      symbol,
      side,
      type: 'market',
      quantity,
      exchangeId: venue.exchangeId,
      routingStrategy: strategy,
      userId: req.user.id
    });
    
    res.json({
      message: 'Smart routing order placed successfully',
      venue,
      order: orderResult
    });
  } catch (error) {
    logger.error('Error with smart routing:', error);
    res.status(500).json({ error: error.message || 'Failed to execute smart routing' });
  }
});

// Portfolio rebalancing with risk management
router.post('/rebalance', authenticateToken, auditLog('rebalance', 'portfolio'), async (req, res) => {
  try {
    const { portfolioId, targetWeights, method = 'risk_parity' } = req.body;
    
    if (!portfolioId || !targetWeights) {
      return res.status(400).json({ error: 'Portfolio ID and target weights are required' });
    }

    const portfolio = riskManagement.getPortfolio(portfolioId);
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    const rebalanceOrders = [];
    
    // Calculate rebalancing trades
    for (const [symbol, targetWeight] of Object.entries(targetWeights)) {
      const currentPosition = portfolio.positions.get(symbol);
      const currentWeight = currentPosition ? currentPosition.weight : 0;
      const weightDiff = targetWeight - currentWeight;
      
      if (Math.abs(weightDiff) > 0.01) { // Only rebalance if difference > 1%
        const targetValue = portfolio.totalValue * targetWeight;
        const currentValue = currentPosition ? currentPosition.marketValue : 0;
        const tradeSide = targetValue > currentValue ? 'buy' : 'sell';
        const tradeQuantity = Math.abs(targetValue - currentValue) / (currentPosition?.currentPrice || 50000);
        
        // Get best venue for this trade
        const venue = await exchangeAbstraction.getBestExecutionVenue(symbol, tradeSide, tradeQuantity);
        
        // Place rebalancing order
        const orderResult = await advancedOrderManager.placeAdvancedOrder({
          symbol,
          side: tradeSide,
          type: 'market',
          quantity: tradeQuantity,
          exchangeId: venue.exchangeId,
          routingStrategy: 'cost_minimization',
          userId: req.user.id
        });
        
        rebalanceOrders.push({
          symbol,
          targetWeight,
          currentWeight,
          tradeSide,
          tradeQuantity,
          venue: venue.exchangeId,
          orderId: orderResult.orderId
        });
      }
    }
    
    res.json({
      message: 'Portfolio rebalancing initiated',
      portfolioId,
      method,
      rebalanceOrders,
      totalOrders: rebalanceOrders.length
    });
  } catch (error) {
    logger.error('Error rebalancing portfolio:', error);
    res.status(500).json({ error: error.message || 'Failed to rebalance portfolio' });
  }
});

// Get trading dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { portfolioId } = req.query;
    
    // Get execution analytics
    const executionAnalytics = advancedOrderManager.getExecutionAnalytics('24h');
    
    // Get exchange status
    const exchanges = exchangeAbstraction.listExchanges();
    
    // Get arbitrage opportunities
    const arbitrageOpportunities = await exchangeAbstraction.detectArbitrageOpportunities(
      ['BTC', 'ETH', 'ADA'],
      0.5
    );
    
    // Get risk alerts if portfolio provided
    let riskData = null;
    if (portfolioId) {
      try {
        const riskChecks = await riskManagement.performRealTimeRiskCheck(portfolioId);
        riskData = {
          riskChecks,
          alerts: riskManagement.getRecentAlerts(portfolioId, 5)
        };
      } catch (error) {
        logger.warn('Failed to get risk data for dashboard:', error.message);
      }
    }
    
    res.json({
      executionAnalytics,
      exchanges: {
        total: exchanges.length,
        connected: exchanges.filter(ex => ex.connected).length,
        list: exchanges
      },
      arbitrage: {
        opportunities: arbitrageOpportunities.length,
        list: arbitrageOpportunities.slice(0, 5) // Top 5
      },
      risk: riskData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting dashboard data:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// System health check
router.get('/health', (req, res) => {
  try {
    const exchanges = exchangeAbstraction.listExchanges();
    const connectedExchanges = exchanges.filter(ex => ex.connected).length;
    
    res.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      components: {
        exchangeAbstraction: 'operational',
        advancedOrderManager: 'operational',
        riskManagement: 'operational'
      },
      exchanges: {
        total: exchanges.length,
        connected: connectedExchanges,
        connectionRate: exchanges.length > 0 ? (connectedExchanges / exchanges.length * 100).toFixed(1) : 0
      },
      version: '1.4.0-enhanced'
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      status: 'degraded',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;