const express = require('express');
const router = express.Router();
const StrategyExecutionEngine = require('../services/strategyExecutionEngine');
const logger = require('../utils/logger');

// Engine instances (in practice, would be managed per account/session)
const engines = new Map();

/**
 * @route POST /api/execution-engine/create
 * @desc Create a new strategy execution engine
 * @access Private
 */
router.post('/create', async (req, res) => {
  try {
    const { engineId, config = {} } = req.body;

    if (!engineId) {
      return res.status(400).json({
        error: 'Engine ID is required'
      });
    }

    if (engines.has(engineId)) {
      return res.status(409).json({
        error: 'Engine already exists',
        engineId
      });
    }

    // Create new execution engine
    const engine = new StrategyExecutionEngine(config);
    
    // Set up event listeners
    setupEngineEventListeners(engine, engineId);
    
    engines.set(engineId, engine);

    res.json({
      success: true,
      engineId,
      config: engine.config,
      message: 'Execution engine created successfully'
    });

  } catch (error) {
    logger.error('Error creating execution engine:', error);
    res.status(500).json({
      error: 'Failed to create engine',
      message: error.message
    });
  }
});

/**
 * @route POST /api/execution-engine/:engineId/start
 * @desc Start the execution engine
 * @access Private
 */
router.post('/:engineId/start', async (req, res) => {
  try {
    const { engineId } = req.params;
    const { portfolioValue = 100000, cash = 100000 } = req.body;

    const engine = engines.get(engineId);
    if (!engine) {
      return res.status(404).json({
        error: 'Engine not found',
        engineId
      });
    }

    await engine.start(portfolioValue, cash);

    res.json({
      success: true,
      engineId,
      portfolioValue,
      cash,
      message: 'Engine started successfully'
    });

  } catch (error) {
    logger.error('Error starting execution engine:', error);
    res.status(500).json({
      error: 'Failed to start engine',
      message: error.message
    });
  }
});

/**
 * @route POST /api/execution-engine/:engineId/stop
 * @desc Stop the execution engine
 * @access Private
 */
router.post('/:engineId/stop', async (req, res) => {
  try {
    const { engineId } = req.params;

    const engine = engines.get(engineId);
    if (!engine) {
      return res.status(404).json({
        error: 'Engine not found',
        engineId
      });
    }

    await engine.stop();

    res.json({
      success: true,
      engineId,
      message: 'Engine stopped successfully'
    });

  } catch (error) {
    logger.error('Error stopping execution engine:', error);
    res.status(500).json({
      error: 'Failed to stop engine',
      message: error.message
    });
  }
});

/**
 * @route POST /api/execution-engine/:engineId/execute-strategy
 * @desc Execute a trading strategy
 * @access Private
 */
router.post('/:engineId/execute-strategy', async (req, res) => {
  try {
    const { engineId } = req.params;
    const { strategyId, signals, metadata = {} } = req.body;

    if (!strategyId || !signals || !Array.isArray(signals)) {
      return res.status(400).json({
        error: 'Strategy ID and signals array are required'
      });
    }

    const engine = engines.get(engineId);
    if (!engine) {
      return res.status(404).json({
        error: 'Engine not found',
        engineId
      });
    }

    const result = await engine.executeStrategy(strategyId, signals, metadata);

    res.json({
      success: true,
      engineId,
      result
    });

  } catch (error) {
    logger.error('Error executing strategy:', error);
    res.status(500).json({
      error: 'Strategy execution failed',
      message: error.message
    });
  }
});

/**
 * @route POST /api/execution-engine/:engineId/create-order
 * @desc Create and submit an order
 * @access Private
 */
router.post('/:engineId/create-order', async (req, res) => {
  try {
    const { engineId } = req.params;
    const orderParams = req.body;

    // Validate required fields
    const requiredFields = ['strategyId', 'symbol', 'side', 'quantity'];
    for (const field of requiredFields) {
      if (!orderParams[field]) {
        return res.status(400).json({
          error: `${field} is required`
        });
      }
    }

    const engine = engines.get(engineId);
    if (!engine) {
      return res.status(404).json({
        error: 'Engine not found',
        engineId
      });
    }

    const order = await engine.createOrder(orderParams);

    res.json({
      success: true,
      engineId,
      order
    });

  } catch (error) {
    logger.error('Error creating order:', error);
    res.status(500).json({
      error: 'Order creation failed',
      message: error.message
    });
  }
});

/**
 * @route GET /api/execution-engine/:engineId/orders
 * @desc Get all orders
 * @access Private
 */
router.get('/:engineId/orders', (req, res) => {
  try {
    const { engineId } = req.params;
    const { status, strategyId, symbol } = req.query;

    const engine = engines.get(engineId);
    if (!engine) {
      return res.status(404).json({
        error: 'Engine not found',
        engineId
      });
    }

    let orders = Array.from(engine.state.orders.values());

    // Apply filters
    if (status) {
      orders = orders.filter(order => order.status === status);
    }
    if (strategyId) {
      orders = orders.filter(order => order.strategyId === strategyId);
    }
    if (symbol) {
      orders = orders.filter(order => order.symbol === symbol);
    }

    res.json({
      success: true,
      engineId,
      orders,
      totalOrders: orders.length
    });

  } catch (error) {
    logger.error('Error fetching orders:', error);
    res.status(500).json({
      error: 'Failed to fetch orders',
      message: error.message
    });
  }
});

/**
 * @route GET /api/execution-engine/:engineId/positions
 * @desc Get all positions
 * @access Private
 */
router.get('/:engineId/positions', (req, res) => {
  try {
    const { engineId } = req.params;
    const { strategyId, symbol } = req.query;

    const engine = engines.get(engineId);
    if (!engine) {
      return res.status(404).json({
        error: 'Engine not found',
        engineId
      });
    }

    let positions = Array.from(engine.state.positions.values());

    // Apply filters
    if (strategyId) {
      positions = positions.filter(position => position.strategyId === strategyId);
    }
    if (symbol) {
      positions = positions.filter(position => position.symbol === symbol);
    }

    // Filter out zero positions unless requested
    if (req.query.includeZero !== 'true') {
      positions = positions.filter(position => position.quantity !== 0);
    }

    res.json({
      success: true,
      engineId,
      positions,
      totalPositions: positions.length
    });

  } catch (error) {
    logger.error('Error fetching positions:', error);
    res.status(500).json({
      error: 'Failed to fetch positions',
      message: error.message
    });
  }
});

/**
 * @route GET /api/execution-engine/:engineId/statistics
 * @desc Get engine statistics and performance metrics
 * @access Private
 */
router.get('/:engineId/statistics', (req, res) => {
  try {
    const { engineId } = req.params;

    const engine = engines.get(engineId);
    if (!engine) {
      return res.status(404).json({
        error: 'Engine not found',
        engineId
      });
    }

    const statistics = engine.getEngineStatistics();

    res.json({
      success: true,
      engineId,
      statistics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching engine statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * @route GET /api/execution-engine/:engineId/portfolio
 * @desc Get portfolio summary
 * @access Private
 */
router.get('/:engineId/portfolio', async (req, res) => {
  try {
    const { engineId } = req.params;

    const engine = engines.get(engineId);
    if (!engine) {
      return res.status(404).json({
        error: 'Engine not found',
        engineId
      });
    }

    // Calculate current portfolio value
    await engine.calculatePortfolioValue();

    const portfolio = {
      portfolioValue: engine.state.portfolioValue,
      cash: engine.state.cash,
      dayStartValue: engine.state.dayStartValue,
      peakValue: engine.state.peakValue,
      positions: Array.from(engine.state.positions.values()).filter(p => p.quantity !== 0),
      riskMetrics: engine.state.riskMetrics,
      maxDrawdown: engine.state.maxDrawdownFromPeak,
      totalReturn: (engine.state.portfolioValue - engine.state.dayStartValue) / engine.state.dayStartValue,
      totalPositions: engine.state.positions.size,
      activeStrategies: engine.state.activeStrategies.size
    };

    res.json({
      success: true,
      engineId,
      portfolio,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching portfolio:', error);
    res.status(500).json({
      error: 'Failed to fetch portfolio',
      message: error.message
    });
  }
});

/**
 * @route POST /api/execution-engine/:engineId/cancel-order
 * @desc Cancel a specific order
 * @access Private
 */
router.post('/:engineId/cancel-order', (req, res) => {
  try {
    const { engineId } = req.params;
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        error: 'Order ID is required'
      });
    }

    const engine = engines.get(engineId);
    if (!engine) {
      return res.status(404).json({
        error: 'Engine not found',
        engineId
      });
    }

    const order = engine.state.orders.get(orderId);
    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        orderId
      });
    }

    if (order.status === 'pending' || order.status === 'executing') {
      order.status = 'cancelled';
      order.updatedAt = Date.now();
      
      // Remove from queue
      const queueIndex = engine.state.orderQueue.indexOf(orderId);
      if (queueIndex > -1) {
        engine.state.orderQueue.splice(queueIndex, 1);
      }

      engine.emit('order:cancelled', order);
    }

    res.json({
      success: true,
      engineId,
      orderId,
      status: order.status,
      message: 'Order cancellation processed'
    });

  } catch (error) {
    logger.error('Error cancelling order:', error);
    res.status(500).json({
      error: 'Failed to cancel order',
      message: error.message
    });
  }
});

/**
 * @route POST /api/execution-engine/:engineId/close-position
 * @desc Close a specific position
 * @access Private
 */
router.post('/:engineId/close-position', async (req, res) => {
  try {
    const { engineId } = req.params;
    const { strategyId, symbol, percentage = 100 } = req.body;

    if (!strategyId || !symbol) {
      return res.status(400).json({
        error: 'Strategy ID and symbol are required'
      });
    }

    const engine = engines.get(engineId);
    if (!engine) {
      return res.status(404).json({
        error: 'Engine not found',
        engineId
      });
    }

    const positionKey = `${strategyId}_${symbol}`;
    const position = engine.state.positions.get(positionKey);

    if (!position || position.quantity === 0) {
      return res.status(404).json({
        error: 'Position not found or already closed',
        positionKey
      });
    }

    // Create closing order
    const closeQuantity = Math.abs(position.quantity) * (percentage / 100);
    const closingSide = position.quantity > 0 ? 'sell' : 'buy';

    const order = await engine.createOrder({
      strategyId,
      symbol,
      side: closingSide,
      quantity: closeQuantity,
      type: 'market',
      metadata: {
        closePosition: true,
        closePercentage: percentage
      }
    });

    res.json({
      success: true,
      engineId,
      positionKey,
      closingOrder: order,
      message: `Position closing order created (${percentage}%)`
    });

  } catch (error) {
    logger.error('Error closing position:', error);
    res.status(500).json({
      error: 'Failed to close position',
      message: error.message
    });
  }
});

/**
 * @route DELETE /api/execution-engine/:engineId
 * @desc Delete execution engine
 * @access Private
 */
router.delete('/:engineId', async (req, res) => {
  try {
    const { engineId } = req.params;

    if (!engines.has(engineId)) {
      return res.status(404).json({
        error: 'Engine not found',
        engineId
      });
    }

    const engine = engines.get(engineId);
    
    // Stop engine if running
    if (engine.state.isRunning) {
      await engine.stop();
    }

    engines.delete(engineId);

    res.json({
      success: true,
      engineId,
      message: 'Engine deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting engine:', error);
    res.status(500).json({
      error: 'Failed to delete engine',
      message: error.message
    });
  }
});

/**
 * @route GET /api/execution-engine/list
 * @desc List all execution engines
 * @access Private
 */
router.get('/list', (req, res) => {
  try {
    const engineList = [];

    for (const [engineId, engine] of engines) {
      const statistics = engine.getEngineStatistics();
      engineList.push({
        engineId,
        isRunning: statistics.isRunning,
        portfolioValue: statistics.portfolioValue,
        activeStrategies: statistics.activeStrategies,
        totalPositions: statistics.totalPositions,
        pendingOrders: statistics.pendingOrders,
        dailyReturn: statistics.dailyReturn
      });
    }

    res.json({
      success: true,
      engines: engineList,
      totalEngines: engineList.length
    });

  } catch (error) {
    logger.error('Error listing engines:', error);
    res.status(500).json({
      error: 'Failed to list engines',
      message: error.message
    });
  }
});

/**
 * @route GET /api/execution-engine/:engineId/health
 * @desc Get engine health status
 * @access Private
 */
router.get('/:engineId/health', (req, res) => {
  try {
    const { engineId } = req.params;

    const engine = engines.get(engineId);
    if (!engine) {
      return res.status(404).json({
        error: 'Engine not found',
        engineId
      });
    }

    const statistics = engine.getEngineStatistics();
    
    // Calculate health score
    const healthScore = calculateEngineHealthScore(statistics);
    const status = getEngineHealthStatus(healthScore);

    res.json({
      success: true,
      engineId,
      health: {
        status,
        score: healthScore,
        indicators: {
          isRunning: statistics.isRunning,
          portfolioValue: statistics.portfolioValue,
          dailyReturn: statistics.dailyReturn,
          maxDrawdown: statistics.maxDrawdown,
          pendingOrders: statistics.pendingOrders,
          riskLevel: calculateRiskLevel(statistics.riskMetrics)
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error checking engine health:', error);
    res.status(500).json({
      error: 'Failed to check health',
      message: error.message
    });
  }
});

// Helper functions

function setupEngineEventListeners(engine, engineId) {
  engine.on('engine:initialized', () => {
    logger.info(`Execution engine ${engineId} initialized`);
  });

  engine.on('engine:started', (data) => {
    logger.info(`Execution engine ${engineId} started`, data);
  });

  engine.on('engine:stopped', (data) => {
    logger.info(`Execution engine ${engineId} stopped`, data);
  });

  engine.on('strategy:executed', (data) => {
    logger.info(`Strategy executed in engine ${engineId}`, data);
  });

  engine.on('order:created', (order) => {
    logger.debug(`Order created in engine ${engineId}`, { orderId: order.id, symbol: order.symbol });
  });

  engine.on('order:filled', (order) => {
    logger.info(`Order filled in engine ${engineId}`, { orderId: order.id, symbol: order.symbol });
  });

  engine.on('position:updated', (position) => {
    logger.debug(`Position updated in engine ${engineId}`, { symbol: position.symbol, quantity: position.quantity });
  });

  engine.on('portfolio:updated', (data) => {
    logger.debug(`Portfolio updated in engine ${engineId}`, data);
  });
}

function calculateEngineHealthScore(statistics) {
  let score = 0;
  
  // Running status (0-20 points)
  if (statistics.isRunning) score += 20;
  
  // Portfolio performance (0-30 points)
  if (statistics.dailyReturn > 0) {
    score += Math.min(30, statistics.dailyReturn * 1000);
  } else {
    score += Math.max(-10, statistics.dailyReturn * 1000);
  }
  
  // Risk management (0-25 points)
  if (statistics.maxDrawdown < 0.05) score += 25;
  else if (statistics.maxDrawdown < 0.1) score += 15;
  else if (statistics.maxDrawdown < 0.2) score += 5;
  
  // Activity level (0-25 points)
  const activityScore = Math.min(25, 
    (statistics.activeStrategies * 5) + 
    (statistics.totalPositions * 2) + 
    (statistics.pendingOrders * 1)
  );
  score += activityScore;
  
  return Math.max(0, Math.min(100, score));
}

function getEngineHealthStatus(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  if (score >= 20) return 'poor';
  return 'critical';
}

function calculateRiskLevel(riskMetrics) {
  if (riskMetrics.currentDrawdown > 0.15 || Math.abs(riskMetrics.dailyPnL) > 0.1) {
    return 'high';
  } else if (riskMetrics.currentDrawdown > 0.05 || Math.abs(riskMetrics.dailyPnL) > 0.03) {
    return 'medium';
  } else {
    return 'low';
  }
}

module.exports = router;