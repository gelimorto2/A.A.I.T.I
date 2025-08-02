const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/init');
const { authenticateToken, auditLog } = require('../middleware/auth');
const multiExchangeSupport = require('../utils/multiExchangeSupport');
const advancedOrderManagement = require('../utils/advancedOrderManagement');
const riskManagementSystem = require('../utils/riskManagementSystem');
const logger = require('../utils/logger');

const router = express.Router();

// =====================================
// MULTI-EXCHANGE SUPPORT ROUTES
// =====================================

// Initialize multi-exchange support
router.post('/exchanges/initialize', authenticateToken, auditLog('initialize_exchanges'), async (req, res) => {
  try {
    await multiExchangeSupport.initialize();
    
    logger.info('Multi-exchange support initialized', { userId: req.user.id });
    
    res.json({
      success: true,
      message: 'Multi-exchange support initialized successfully',
      status: multiExchangeSupport.getSystemStatus()
    });
  } catch (error) {
    logger.error('Error initializing multi-exchange support:', error);
    res.status(500).json({ error: 'Failed to initialize multi-exchange support' });
  }
});

// Get exchange system status
router.get('/exchanges/status', authenticateToken, (req, res) => {
  try {
    const status = multiExchangeSupport.getSystemStatus();
    res.json({ status });
  } catch (error) {
    logger.error('Error getting exchange status:', error);
    res.status(500).json({ error: 'Failed to get exchange status' });
  }
});

// Get consolidated market data
router.get('/exchanges/market-data/:symbol', authenticateToken, async (req, res) => {
  try {
    const { symbol } = req.params;
    const marketData = await multiExchangeSupport.getConsolidatedMarketData(symbol);
    
    res.json({
      success: true,
      symbol,
      marketData,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error getting consolidated market data:', error);
    res.status(500).json({ error: 'Failed to get market data' });
  }
});

// Get arbitrage opportunities
router.get('/exchanges/arbitrage', authenticateToken, async (req, res) => {
  try {
    const { symbols } = req.query;
    const symbolList = symbols ? symbols.split(',') : multiExchangeSupport.getCommonSymbols().slice(0, 10);
    
    const opportunities = await multiExchangeSupport.detectArbitrageOpportunities(symbolList);
    
    res.json({
      success: true,
      opportunities,
      count: opportunities.length,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error detecting arbitrage opportunities:', error);
    res.status(500).json({ error: 'Failed to detect arbitrage opportunities' });
  }
});

// Execute arbitrage trade
router.post('/exchanges/arbitrage/execute', authenticateToken, auditLog('execute_arbitrage'), async (req, res) => {
  try {
    const { opportunityIndex } = req.body;
    
    if (opportunityIndex === undefined || multiExchangeSupport.arbitrageOpportunities.length <= opportunityIndex) {
      return res.status(400).json({ error: 'Invalid arbitrage opportunity index' });
    }
    
    const opportunity = multiExchangeSupport.arbitrageOpportunities[opportunityIndex];
    const arbitrageTrade = await multiExchangeSupport.executeArbitrageTrade(opportunity);
    
    // Save to database
    db.run(
      `INSERT INTO arbitrage_trades (
        id, user_id, symbol, buy_exchange, sell_exchange, buy_price, sell_price,
        quantity, expected_profit, status, executed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        arbitrageTrade.id,
        req.user.id,
        opportunity.symbol,
        opportunity.buyExchange,
        opportunity.sellExchange,
        opportunity.buyPrice,
        opportunity.sellPrice,
        arbitrageTrade.quantity,
        arbitrageTrade.expectedProfit,
        arbitrageTrade.status,
        new Date().toISOString()
      ]
    );
    
    logger.info('Arbitrage trade executed', {
      userId: req.user.id,
      tradeId: arbitrageTrade.id,
      expectedProfit: arbitrageTrade.expectedProfit
    });
    
    res.json({
      success: true,
      trade: arbitrageTrade
    });
  } catch (error) {
    logger.error('Error executing arbitrage trade:', error);
    res.status(500).json({ error: 'Failed to execute arbitrage trade' });
  }
});

// =====================================
// ADVANCED ORDER MANAGEMENT ROUTES
// =====================================

// Place advanced order
router.post('/orders/advanced', authenticateToken, auditLog('place_advanced_order'), async (req, res) => {
  try {
    const orderRequest = {
      ...req.body,
      userId: req.user.id
    };
    
    const order = await advancedOrderManagement.placeOrder(orderRequest);
    
    // Save to database
    db.run(
      `INSERT INTO advanced_orders (
        id, user_id, symbol, side, type, quantity, price, stop_price, 
        status, parameters, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.id,
        req.user.id,
        order.symbol,
        order.side,
        order.type,
        order.quantity,
        order.price || null,
        order.stopPrice || null,
        order.status,
        JSON.stringify(order),
        new Date().toISOString()
      ]
    );
    
    logger.info('Advanced order placed', {
      userId: req.user.id,
      orderId: order.id,
      type: order.type,
      symbol: order.symbol
    });
    
    res.json({
      success: true,
      order
    });
  } catch (error) {
    logger.error('Error placing advanced order:', error);
    res.status(500).json({ error: error.message || 'Failed to place advanced order' });
  }
});

// Get order details
router.get('/orders/:orderId', authenticateToken, (req, res) => {
  try {
    const { orderId } = req.params;
    const order = advancedOrderManagement.getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ order });
  } catch (error) {
    logger.error('Error getting order details:', error);
    res.status(500).json({ error: 'Failed to get order details' });
  }
});

// Get orders with filtering
router.get('/orders', authenticateToken, (req, res) => {
  try {
    const criteria = {
      ...req.query,
      userId: req.user.id
    };
    
    const orders = advancedOrderManagement.getOrders(criteria);
    
    res.json({
      orders,
      count: orders.length,
      criteria
    });
  } catch (error) {
    logger.error('Error getting orders:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

// Cancel order
router.delete('/orders/:orderId', authenticateToken, auditLog('cancel_order'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await advancedOrderManagement.cancelOrder(orderId);
    
    // Update database
    db.run(
      'UPDATE advanced_orders SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      ['CANCELLED', new Date().toISOString(), orderId, req.user.id]
    );
    
    logger.info('Order cancelled', {
      userId: req.user.id,
      orderId
    });
    
    res.json({
      success: true,
      order
    });
  } catch (error) {
    logger.error('Error cancelling order:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel order' });
  }
});

// Get order management analytics
router.get('/orders/analytics', authenticateToken, (req, res) => {
  try {
    const analytics = advancedOrderManagement.getAnalytics();
    
    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    logger.error('Error getting order analytics:', error);
    res.status(500).json({ error: 'Failed to get order analytics' });
  }
});

// =====================================
// RISK MANAGEMENT ROUTES
// =====================================

// Calculate position size
router.post('/risk/position-size', authenticateToken, auditLog('calculate_position_size'), async (req, res) => {
  try {
    const {
      symbol,
      direction,
      entryPrice,
      stopPrice,
      riskPerTrade,
      method,
      portfolioValue,
      maxPositionValue
    } = req.body;
    
    if (!symbol || !direction || !entryPrice) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const positionSize = await riskManagementSystem.calculatePositionSize(
      symbol,
      direction,
      entryPrice,
      stopPrice,
      {
        riskPerTrade,
        method,
        portfolioValue,
        maxPositionValue
      }
    );
    
    logger.info('Position size calculated', {
      userId: req.user.id,
      symbol,
      method,
      positionSize: positionSize.quantity
    });
    
    res.json({
      success: true,
      positionSize
    });
  } catch (error) {
    logger.error('Error calculating position size:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate position size' });
  }
});

// Get current risk metrics
router.get('/risk/metrics', authenticateToken, (req, res) => {
  try {
    const metrics = riskManagementSystem.getRiskMetrics();
    
    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    logger.error('Error getting risk metrics:', error);
    res.status(500).json({ error: 'Failed to get risk metrics' });
  }
});

// Calculate VaR for a symbol
router.post('/risk/var', authenticateToken, auditLog('calculate_var'), async (req, res) => {
  try {
    const {
      symbol,
      horizon = 1,
      confidenceLevel = 0.95
    } = req.body;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }
    
    const var1Day = await riskManagementSystem.calculateVaR(symbol, horizon, confidenceLevel);
    
    logger.info('VaR calculated', {
      userId: req.user.id,
      symbol,
      horizon,
      confidenceLevel,
      var: var1Day
    });
    
    res.json({
      success: true,
      symbol,
      horizon,
      confidenceLevel,
      var: var1Day,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error calculating VaR:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate VaR' });
  }
});

// Get portfolio risk analysis
router.get('/risk/portfolio', authenticateToken, (req, res) => {
  try {
    const positions = riskManagementSystem.getPositions();
    const riskMetrics = riskManagementSystem.getRiskMetrics();
    
    res.json({
      success: true,
      positions,
      riskMetrics,
      portfolioAnalysis: {
        totalPositions: positions.length,
        totalValue: positions.reduce((sum, pos) => sum + (pos.marketValue || 0), 0),
        riskLevel: riskMetrics?.riskLimitBreaches?.length > 0 ? 'HIGH' : 'NORMAL'
      }
    });
  } catch (error) {
    logger.error('Error getting portfolio risk analysis:', error);
    res.status(500).json({ error: 'Failed to get portfolio risk analysis' });
  }
});

// Update risk limits
router.put('/risk/limits', authenticateToken, auditLog('update_risk_limits'), (req, res) => {
  try {
    const newLimits = req.body;
    riskManagementSystem.updateRiskLimits(newLimits);
    
    logger.info('Risk limits updated', {
      userId: req.user.id,
      newLimits
    });
    
    res.json({
      success: true,
      message: 'Risk limits updated successfully',
      newLimits
    });
  } catch (error) {
    logger.error('Error updating risk limits:', error);
    res.status(500).json({ error: 'Failed to update risk limits' });
  }
});

// Get risk system status
router.get('/risk/status', authenticateToken, (req, res) => {
  try {
    const status = riskManagementSystem.getSystemStatus();
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error('Error getting risk system status:', error);
    res.status(500).json({ error: 'Failed to get risk system status' });
  }
});

// =====================================
// COMBINED TRADING ANALYTICS
// =====================================

// Get comprehensive trading system status
router.get('/system/status', authenticateToken, (req, res) => {
  try {
    const systemStatus = {
      exchanges: multiExchangeSupport.getSystemStatus(),
      orderManagement: advancedOrderManagement.getStatus(),
      riskManagement: riskManagementSystem.getSystemStatus(),
      timestamp: Date.now()
    };
    
    res.json({
      success: true,
      systemStatus
    });
  } catch (error) {
    logger.error('Error getting system status:', error);
    res.status(500).json({ error: 'Failed to get system status' });
  }
});

// Get trading performance analytics
router.get('/analytics/performance', authenticateToken, (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get data from database
    db.all(
      `SELECT * FROM advanced_orders 
       WHERE user_id = ? 
       AND created_at >= ? 
       AND created_at <= ?
       ORDER BY created_at DESC`,
      [
        req.user.id,
        startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate || new Date().toISOString()
      ],
      (err, orders) => {
        if (err) {
          logger.error('Error fetching orders for analytics:', err);
          return res.status(500).json({ error: 'Failed to fetch trading analytics' });
        }
        
        // Calculate performance metrics
        const analytics = {
          totalOrders: orders.length,
          successfulOrders: orders.filter(o => o.status === 'FILLED').length,
          orderTypes: {},
          symbols: {},
          dailyActivity: {}
        };
        
        // Group by order type
        orders.forEach(order => {
          analytics.orderTypes[order.type] = (analytics.orderTypes[order.type] || 0) + 1;
          analytics.symbols[order.symbol] = (analytics.symbols[order.symbol] || 0) + 1;
          
          const date = order.created_at.split('T')[0];
          analytics.dailyActivity[date] = (analytics.dailyActivity[date] || 0) + 1;
        });
        
        analytics.successRate = analytics.totalOrders > 0 
          ? analytics.successfulOrders / analytics.totalOrders 
          : 0;
        
        res.json({
          success: true,
          analytics,
          period: { startDate, endDate }
        });
      }
    );
  } catch (error) {
    logger.error('Error getting trading analytics:', error);
    res.status(500).json({ error: 'Failed to get trading analytics' });
  }
});

module.exports = router;