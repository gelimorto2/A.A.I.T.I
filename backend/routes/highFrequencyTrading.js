const express = require('express');
const { authenticateToken, auditLog } = require('../middleware/auth');
const ExchangeAbstraction = require('../utils/exchangeAbstraction');
const AdvancedOrderManager = require('../utils/advancedOrderManager');
const HighFrequencyTradingService = require('../utils/highFrequencyTradingService');
const logger = require('../utils/logger');

const router = express.Router();

// Initialize services
const exchangeAbstraction = new ExchangeAbstraction();
const advancedOrderManager = new AdvancedOrderManager(exchangeAbstraction);
const hftService = new HighFrequencyTradingService(exchangeAbstraction);

// Initialize demo exchanges
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

  exchangeAbstraction.registerExchange('kraken_main', 'kraken', {
    apiKey: process.env.KRAKEN_API_KEY || 'demo_key',
    apiSecret: process.env.KRAKEN_API_SECRET || 'demo_secret',
    testnet: !process.env.KRAKEN_API_KEY
  });
} catch (error) {
  logger.warn('Failed to initialize some exchanges for HFT:', error.message);
}

// =================
// ADVANCED ORDER TYPES (High Priority)
// =================

/**
 * @swagger
 * /api/hft/orders/advanced:
 *   post:
 *     summary: Place advanced order (OCO, Iceberg, TWAP, Trailing Stop)
 *     tags: [High-Frequency Trading]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - symbol
 *               - side
 *               - quantity
 *               - exchangeId
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [oco, iceberg, twap, vwap, bracket, trailing_stop]
 *               symbol:
 *                 type: string
 *                 example: "BTC/USDT"
 *               side:
 *                 type: string
 *                 enum: [buy, sell]
 *               quantity:
 *                 type: number
 *                 example: 1.5
 *               exchangeId:
 *                 type: string
 *                 example: "binance_main"
 *               # OCO specific
 *               stopPrice:
 *                 type: number
 *               limitPrice:
 *                 type: number
 *               # Iceberg specific
 *               icebergQuantity:
 *                 type: number
 *               # TWAP specific
 *               duration:
 *                 type: number
 *                 description: "Duration in seconds"
 *               slices:
 *                 type: number
 *               # Trailing Stop specific
 *               trailingAmount:
 *                 type: number
 *               trailingPercent:
 *                 type: number
 *     responses:
 *       200:
 *         description: Advanced order placed successfully
 *       400:
 *         description: Invalid order parameters
 *       401:
 *         description: Unauthorized
 */
router.post('/orders/advanced', authenticateToken, auditLog, async (req, res) => {
  try {
    const orderParams = req.body;
    
    // Validate required fields
    const requiredFields = ['type', 'symbol', 'side', 'quantity', 'exchangeId'];
    for (const field of requiredFields) {
      if (!orderParams[field]) {
        return res.status(400).json({
          success: false,
          error: `Missing required field: ${field}`
        });
      }
    }

    // Validate order type
    const validTypes = ['oco', 'iceberg', 'twap', 'vwap', 'bracket', 'trailing_stop'];
    if (!validTypes.includes(orderParams.type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid order type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Type-specific validation
    if (orderParams.type === 'oco' && (!orderParams.stopPrice || !orderParams.limitPrice)) {
      return res.status(400).json({
        success: false,
        error: 'OCO orders require both stopPrice and limitPrice'
      });
    }

    if (orderParams.type === 'trailing_stop' && !orderParams.trailingAmount && !orderParams.trailingPercent) {
      return res.status(400).json({
        success: false,
        error: 'Trailing stop orders require either trailingAmount or trailingPercent'
      });
    }

    const result = await advancedOrderManager.placeAdvancedOrder(orderParams);

    logger.info('Advanced order placed', {
      orderId: result.orderId,
      type: orderParams.type,
      userId: req.user?.id
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error placing advanced order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/hft/orders/trailing-stop:
 *   post:
 *     summary: Place trailing stop order with dynamic adjustments
 *     tags: [High-Frequency Trading]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - symbol
 *               - side
 *               - quantity
 *               - exchangeId
 *             properties:
 *               symbol:
 *                 type: string
 *                 example: "BTC/USDT"
 *               side:
 *                 type: string
 *                 enum: [buy, sell]
 *               quantity:
 *                 type: number
 *                 example: 1.5
 *               exchangeId:
 *                 type: string
 *                 example: "binance_main"
 *               trailingAmount:
 *                 type: number
 *                 description: "Fixed amount to trail by"
 *                 example: 100
 *               trailingPercent:
 *                 type: number
 *                 description: "Percentage to trail by"
 *                 example: 2.5
 *     responses:
 *       200:
 *         description: Trailing stop order placed successfully
 */
router.post('/orders/trailing-stop', authenticateToken, auditLog, async (req, res) => {
  try {
    const orderParams = {
      ...req.body,
      type: 'trailing_stop'
    };

    const result = await advancedOrderManager.placeAdvancedOrder(orderParams);

    logger.info('Trailing stop order placed', {
      orderId: result.orderId,
      userId: req.user?.id
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error placing trailing stop order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/hft/orders/{orderId}:
 *   get:
 *     summary: Get advanced order status
 *     tags: [High-Frequency Trading]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order status retrieved successfully
 *       404:
 *         description: Order not found
 */
router.get('/orders/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = advancedOrderManager.getOrder(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    logger.error('Error retrieving order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/hft/orders/{orderId}/cancel:
 *   post:
 *     summary: Cancel advanced order
 *     tags: [High-Frequency Trading]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       404:
 *         description: Order not found
 */
router.post('/orders/:orderId/cancel', authenticateToken, auditLog, async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await advancedOrderManager.cancelOrder(orderId);

    logger.info('Advanced order cancelled', {
      orderId,
      userId: req.user?.id
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/hft/orders:
 *   get:
 *     summary: List active advanced orders
 *     tags: [High-Frequency Trading]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: symbol
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: exchangeId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Active orders retrieved successfully
 */
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const filters = {
      symbol: req.query.symbol,
      type: req.query.type,
      exchangeId: req.query.exchangeId
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const orders = advancedOrderManager.listActiveOrders(filters);

    res.json({
      success: true,
      data: {
        orders,
        count: orders.length,
        filters
      }
    });

  } catch (error) {
    logger.error('Error listing orders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =================
// LOW-LATENCY INFRASTRUCTURE
// =================

/**
 * @swagger
 * /api/hft/websocket/initialize:
 *   post:
 *     summary: Initialize WebSocket streaming for all exchanges
 *     tags: [High-Frequency Trading]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: WebSocket streaming initialized successfully
 */
router.post('/websocket/initialize', authenticateToken, auditLog, async (req, res) => {
  try {
    const result = await hftService.initializeWebSocketStreaming();

    logger.info('WebSocket streaming initialized', {
      activeConnections: result.activeConnections,
      userId: req.user?.id
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error initializing WebSocket streaming:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/hft/websocket/status:
 *   get:
 *     summary: Get WebSocket streaming status
 *     tags: [High-Frequency Trading]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: WebSocket status retrieved successfully
 */
router.get('/websocket/status', authenticateToken, async (req, res) => {
  try {
    const status = hftService.getStreamingStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Error getting WebSocket status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/hft/orders/batch:
 *   post:
 *     summary: Submit order for smart batching
 *     tags: [High-Frequency Trading]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - symbol
 *               - side
 *               - type
 *               - quantity
 *               - exchangeId
 *             properties:
 *               symbol:
 *                 type: string
 *                 example: "BTC/USDT"
 *               side:
 *                 type: string
 *                 enum: [buy, sell]
 *               type:
 *                 type: string
 *                 enum: [market, limit]
 *               quantity:
 *                 type: number
 *                 example: 1.5
 *               price:
 *                 type: number
 *                 example: 50000
 *               exchangeId:
 *                 type: string
 *                 example: "binance_main"
 *     responses:
 *       200:
 *         description: Order added to batch successfully
 */
router.post('/orders/batch', authenticateToken, auditLog, async (req, res) => {
  try {
    const orderRequest = req.body;
    
    // Validate required fields
    const requiredFields = ['symbol', 'side', 'type', 'quantity', 'exchangeId'];
    for (const field of requiredFields) {
      if (!orderRequest[field]) {
        return res.status(400).json({
          success: false,
          error: `Missing required field: ${field}`
        });
      }
    }

    const result = await hftService.batchOrder(orderRequest);

    logger.info('Order added to batch', {
      batchSize: result.batchSize,
      userId: req.user?.id
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error batching order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/hft/colocation/recommendations:
 *   get:
 *     summary: Get co-location optimization recommendations
 *     tags: [High-Frequency Trading]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Co-location recommendations generated successfully
 */
router.get('/colocation/recommendations', authenticateToken, async (req, res) => {
  try {
    const recommendations = await hftService.generateCoLocationRecommendations();

    res.json({
      success: true,
      data: recommendations
    });

  } catch (error) {
    logger.error('Error generating co-location recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/hft/performance/metrics:
 *   get:
 *     summary: Get HFT performance metrics
 *     tags: [High-Frequency Trading]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
 */
router.get('/performance/metrics', authenticateToken, async (req, res) => {
  try {
    const metrics = hftService.getPerformanceMetrics();

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/hft/analytics/execution:
 *   get:
 *     summary: Get order execution analytics
 *     tags: [High-Frequency Trading]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d, 30d]
 *           default: 24h
 *     responses:
 *       200:
 *         description: Execution analytics retrieved successfully
 */
router.get('/analytics/execution', authenticateToken, async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '24h';
    const analytics = advancedOrderManager.getExecutionAnalytics(timeframe);

    res.json({
      success: true,
      data: {
        timeframe,
        analytics
      }
    });

  } catch (error) {
    logger.error('Error getting execution analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/hft/order-types:
 *   get:
 *     summary: Get available advanced order types
 *     tags: [High-Frequency Trading]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order types retrieved successfully
 */
router.get('/order-types', authenticateToken, async (req, res) => {
  try {
    const orderTypes = advancedOrderManager.getOrderTypes();
    const executionStrategies = advancedOrderManager.getExecutionStrategies();

    res.json({
      success: true,
      data: {
        orderTypes,
        executionStrategies
      }
    });

  } catch (error) {
    logger.error('Error getting order types:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/hft/status:
 *   get:
 *     summary: Get overall HFT system status
 *     tags: [High-Frequency Trading]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: HFT system status retrieved successfully
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const streamingStatus = hftService.getStreamingStatus();
    const performanceMetrics = hftService.getPerformanceMetrics();
    const executionAnalytics = advancedOrderManager.getExecutionAnalytics('1h');

    const status = {
      timestamp: new Date().toISOString(),
      websocketStreaming: {
        enabled: streamingStatus.totalConnections > 0,
        activeConnections: streamingStatus.activeConnections,
        totalConnections: streamingStatus.totalConnections
      },
      orderBatching: {
        enabled: true,
        currentBatchSize: streamingStatus.batchStats.currentBatchSize,
        batchTimeoutActive: streamingStatus.batchStats.batchTimeoutActive
      },
      advancedOrders: {
        enabled: true,
        activeOrders: executionAnalytics.totalOrders,
        supportedTypes: ['oco', 'iceberg', 'twap', 'vwap', 'bracket', 'trailing_stop']
      },
      latency: {
        avgLatency: Object.values(performanceMetrics.latencyMetrics).reduce((avg, metric) => 
          avg + (metric.average || 0), 0) / Math.max(Object.keys(performanceMetrics.latencyMetrics).length, 1),
        exchanges: Object.keys(performanceMetrics.latencyMetrics).length
      }
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Error getting HFT status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  logger.error('HFT route error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error in HFT module'
  });
});

module.exports = router;