const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const ProductionMLModel = require('../utils/productionMLModel');
const RealTradingEngine = require('../utils/realTradingEngine');
const RealExchangeService = require('../utils/realExchangeService');
const logger = require('../utils/logger');

const router = express.Router();

// Store active models and trading engine
const activeModels = new Map();
const tradingEngine = new RealTradingEngine();
const exchangeService = new RealExchangeService();

// Start position monitoring
tradingEngine.startMonitoring();

/**
 * Production Trading Routes - Real cryptocurrency trading with ML
 */

// Test exchange connection
router.get('/exchange/test', authenticateToken, async (req, res) => {
  try {
    const result = await exchangeService.testConnection();
    res.json({
      success: true,
      connection: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Exchange connection test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get real-time portfolio balance
router.get('/portfolio/balance', authenticateToken, async (req, res) => {
  try {
    const balance = await exchangeService.getBinanceAccountBalance();
    const portfolio = await tradingEngine.getPortfolioSummary();
    
    res.json({
      success: true,
      balance,
      portfolio,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get portfolio balance:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Create and train a production ML model
router.post('/model/create', authenticateToken, async (req, res) => {
  try {
    const { name, symbol, timeframe, lookbackPeriod } = req.body;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required'
      });
    }

    const modelConfig = {
      id: `model-${Date.now()}`,
      name: name || `ML Model - ${symbol}`,
      symbol,
      timeframe: timeframe || '1h',
      lookbackPeriod: lookbackPeriod || 100
    };

    const model = new ProductionMLModel(modelConfig);
    
    // Start training in background
    model.trainModel().then(() => {
      logger.info(`Model training completed: ${model.id}`);
    }).catch(error => {
      logger.error(`Model training failed: ${model.id}`, error);
    });

    activeModels.set(model.id, model);

    res.json({
      success: true,
      model: {
        id: model.id,
        name: model.name,
        symbol: model.symbol,
        status: 'training'
      },
      message: 'Model created and training started',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to create ML model:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get model status and performance
router.get('/model/:modelId/status', authenticateToken, (req, res) => {
  try {
    const model = activeModels.get(req.params.modelId);
    
    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }

    const status = model.getModelStatus();
    
    res.json({
      success: true,
      model: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get model status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Generate ML prediction
router.post('/model/:modelId/predict', authenticateToken, async (req, res) => {
  try {
    const model = activeModels.get(req.params.modelId);
    
    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }

    if (!model.isReady) {
      return res.status(400).json({
        success: false,
        error: 'Model is not ready. Please wait for training to complete.'
      });
    }

    const prediction = await model.makePrediction();
    
    res.json({
      success: true,
      prediction,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to generate prediction:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Execute trading signal
router.post('/trade/execute', authenticateToken, async (req, res) => {
  try {
    const { modelId, autoExecute = false } = req.body;
    
    const model = activeModels.get(modelId);
    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }

    if (!model.isReady) {
      return res.status(400).json({
        success: false,
        error: 'Model is not ready for trading'
      });
    }

    // Generate prediction
    const prediction = await model.makePrediction();
    
    if (!autoExecute) {
      // Return prediction for manual review
      return res.json({
        success: true,
        prediction,
        message: 'Prediction generated. Set autoExecute=true to execute trade.',
        timestamp: new Date().toISOString()
      });
    }

    // Execute the trade if confidence is high enough
    if (prediction.action !== 'HOLD' && prediction.confidence > 0.7) {
      const tradeResult = await tradingEngine.executeSignal(prediction);
      
      res.json({
        success: true,
        prediction,
        trade: tradeResult,
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        success: true,
        prediction,
        trade: { success: false, reason: 'Signal not strong enough for execution' },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    logger.error('Failed to execute trade:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get active positions
router.get('/positions', authenticateToken, async (req, res) => {
  try {
    const portfolio = await tradingEngine.getPortfolioSummary();
    
    res.json({
      success: true,
      positions: portfolio.positions,
      summary: {
        totalBalance: portfolio.totalBalance,
        dailyPnL: portfolio.dailyPnL,
        activePositions: portfolio.activePositions
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get positions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Close a position
router.post('/position/:positionId/close', authenticateToken, async (req, res) => {
  try {
    const { positionId } = req.params;
    const { reason = 'Manual close' } = req.body;
    
    const result = await tradingEngine.closePosition(positionId, reason);
    
    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to close position:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get real-time market data
router.get('/market/:symbol', authenticateToken, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1h', limit = 100 } = req.query;
    
    const marketData = await exchangeService.getBinanceMarketData(symbol, interval, parseInt(limit));
    const ticker = await exchangeService.getRealTimeTicker(symbol);
    
    res.json({
      success: true,
      symbol,
      ticker,
      ohlcv: marketData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get market data:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// List all active models
router.get('/models', authenticateToken, (req, res) => {
  try {
    const models = Array.from(activeModels.values()).map(model => model.getModelStatus());
    
    res.json({
      success: true,
      models,
      count: models.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to list models:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Automated trading scheduler - runs predictions and executes trades
router.post('/automated/start', authenticateToken, async (req, res) => {
  try {
    const { modelIds, interval = 300000 } = req.body; // Default 5 minutes
    
    if (!Array.isArray(modelIds) || modelIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Model IDs array is required'
      });
    }

    // Start automated trading loop
    const automationId = `automation-${Date.now()}`;
    
    const intervalId = setInterval(async () => {
      for (const modelId of modelIds) {
        try {
          const model = activeModels.get(modelId);
          if (model && model.isReady) {
            const prediction = await model.makePrediction();
            
            if (prediction.action !== 'HOLD' && prediction.confidence > 0.75) {
              const tradeResult = await tradingEngine.executeSignal(prediction);
              logger.info(`Automated trade executed`, {
                modelId,
                symbol: prediction.symbol,
                action: prediction.action,
                success: tradeResult.success
              });
            }
          }
        } catch (error) {
          logger.error(`Automated trading error for model ${modelId}:`, error);
        }
      }
    }, interval);

    // Store interval ID for cleanup
    global.automationIntervals = global.automationIntervals || new Map();
    global.automationIntervals.set(automationId, intervalId);

    res.json({
      success: true,
      automationId,
      message: 'Automated trading started',
      interval: interval / 1000 + ' seconds',
      modelIds,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to start automated trading:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Stop automated trading
router.post('/automated/:automationId/stop', authenticateToken, (req, res) => {
  try {
    const { automationId } = req.params;
    
    if (global.automationIntervals && global.automationIntervals.has(automationId)) {
      clearInterval(global.automationIntervals.get(automationId));
      global.automationIntervals.delete(automationId);
      
      res.json({
        success: true,
        message: 'Automated trading stopped',
        automationId,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Automation not found',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    logger.error('Failed to stop automated trading:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;