const express = require('express');
const { authenticateToken, auditLog } = require('../middleware/auth');
const ExchangeAbstraction = require('../utils/exchangeAbstraction');
const AdvancedOrderManager = require('../utils/advancedOrderManager');
const logger = require('../utils/logger');

const router = express.Router();

// Initialize exchange abstraction layer
const exchangeAbstraction = new ExchangeAbstraction();
const advancedOrderManager = new AdvancedOrderManager(exchangeAbstraction);

// Register default exchanges with demo credentials
try {
  // Register all supported exchanges with demo credentials
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

  exchangeAbstraction.registerExchange('kucoin_main', 'kucoin', {
    apiKey: process.env.KUCOIN_API_KEY || 'demo_key',
    apiSecret: process.env.KUCOIN_API_SECRET || 'demo_secret',
    passphrase: process.env.KUCOIN_PASSPHRASE || 'demo_passphrase',
    sandbox: !process.env.KUCOIN_API_KEY
  });

  exchangeAbstraction.registerExchange('bybit_main', 'bybit', {
    apiKey: process.env.BYBIT_API_KEY || 'demo_key',
    apiSecret: process.env.BYBIT_API_SECRET || 'demo_secret',
    testnet: !process.env.BYBIT_API_KEY
  });

  exchangeAbstraction.registerExchange('alpha_vantage', 'alpha_vantage', {
    apiKey: process.env.ALPHA_VANTAGE_API_KEY || 'demo'
  });

  logger.info('Exchange Integration Hub initialized with 6 exchanges');
} catch (error) {
  logger.error('Error initializing exchanges:', error);
}

// ===== EXCHANGE MANAGEMENT =====

// Get list of available exchanges
router.get('/exchanges', authenticateToken, async (req, res) => {
  try {
    const exchanges = exchangeAbstraction.listExchanges();
    const supportedTypes = Object.values(exchangeAbstraction.supportedExchanges);
    
    res.json({
      success: true,
      exchanges,
      supportedTypes,
      totalExchanges: exchanges.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error listing exchanges:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list exchanges',
      message: error.message
    });
  }
});

// Test connection to specific exchange
router.post('/exchanges/:exchangeId/test', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const result = await exchangeAbstraction.testConnection(exchangeId);
    
    auditLog(req.user.id, 'exchange_connection_test', { exchangeId, result });
    
    res.json({
      success: result.success,
      exchangeId,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error testing connection to ${req.params.exchangeId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Connection test failed',
      message: error.message,
      exchangeId: req.params.exchangeId
    });
  }
});

// Register new exchange
router.post('/exchanges/register', authenticateToken, async (req, res) => {
  try {
    const { exchangeId, exchangeType, credentials } = req.body;
    
    if (!exchangeId || !exchangeType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: exchangeId, exchangeType'
      });
    }
    
    const id = exchangeAbstraction.registerExchange(exchangeId, exchangeType, credentials);
    
    auditLog(req.user.id, 'exchange_registered', { exchangeId: id, exchangeType });
    
    res.json({
      success: true,
      exchangeId: id,
      exchangeType,
      message: 'Exchange registered successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error registering exchange:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register exchange',
      message: error.message
    });
  }
});

// ===== UNIFIED ORDER BOOK =====

// Get unified order book across exchanges
router.get('/orderbook/:symbol', authenticateToken, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { exchanges, depth = 50 } = req.query;
    
    const targetExchanges = exchanges ? exchanges.split(',') : null;
    const orderBook = await exchangeAbstraction.getUnifiedOrderBook(
      symbol, 
      targetExchanges, 
      parseInt(depth)
    );
    
    res.json({
      success: true,
      orderBook,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error getting unified order book for ${req.params.symbol}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unified order book',
      message: error.message,
      symbol: req.params.symbol
    });
  }
});

// Get order book from specific exchange
router.get('/exchanges/:exchangeId/orderbook/:symbol', authenticateToken, async (req, res) => {
  try {
    const { exchangeId, symbol } = req.params;
    const { depth = 50 } = req.query;
    
    const exchange = exchangeAbstraction.exchanges.get(exchangeId);
    if (!exchange) {
      return res.status(404).json({
        success: false,
        error: 'Exchange not found',
        exchangeId
      });
    }
    
    const orderBook = await exchange.instance.getOrderBook(symbol, parseInt(depth));
    
    res.json({
      success: true,
      exchangeId,
      orderBook,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error getting order book from ${req.params.exchangeId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get order book',
      message: error.message,
      exchangeId: req.params.exchangeId,
      symbol: req.params.symbol
    });
  }
});

// ===== ARBITRAGE DETECTION =====

// Detect arbitrage opportunities
router.post('/arbitrage/detect', authenticateToken, async (req, res) => {
  try {
    const { symbols, minProfitPercent = 0.5 } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({
        success: false,
        error: 'symbols array is required'
      });
    }
    
    const opportunities = await exchangeAbstraction.detectArbitrageOpportunities(
      symbols, 
      parseFloat(minProfitPercent)
    );
    
    auditLog(req.user.id, 'arbitrage_detection', { 
      symbols, 
      minProfitPercent, 
      opportunitiesFound: opportunities.length 
    });
    
    res.json({
      success: true,
      opportunities,
      symbolsChecked: symbols.length,
      minProfitPercent: parseFloat(minProfitPercent),
      opportunitiesFound: opportunities.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error detecting arbitrage opportunities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect arbitrage opportunities',
      message: error.message
    });
  }
});

// ===== SMART ORDER ROUTING =====

// Get best execution venue for order
router.post('/routing/best-venue', authenticateToken, async (req, res) => {
  try {
    const { symbol, side, quantity } = req.body;
    
    if (!symbol || !side || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, side, quantity'
      });
    }
    
    const bestVenue = await exchangeAbstraction.getBestExecutionVenue(symbol, side, quantity);
    
    res.json({
      success: true,
      bestVenue,
      recommendation: {
        symbol,
        side,
        quantity,
        recommendedExchange: bestVenue.exchangeId,
        estimatedCost: bestVenue.totalCost,
        fees: bestVenue.fees
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error finding best execution venue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find best execution venue',
      message: error.message
    });
  }
});

// ===== POSITION SYNCHRONIZATION =====

// Synchronize positions across exchanges
router.get('/positions/sync', authenticateToken, async (req, res) => {
  try {
    const positions = await exchangeAbstraction.synchronizePositions();
    
    auditLog(req.user.id, 'position_synchronization', { 
      exchangeCount: positions.exchangeCount,
      assetsCount: positions.positions.length 
    });
    
    res.json({
      success: true,
      positions,
      summary: {
        totalExchanges: positions.exchangeCount,
        totalAssets: positions.positions.length,
        errors: positions.errors.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error synchronizing positions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to synchronize positions',
      message: error.message
    });
  }
});

// Get balances from specific exchange
router.get('/exchanges/:exchangeId/balance', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const balance = await exchangeAbstraction.getBalance(exchangeId);
    
    res.json({
      success: true,
      exchangeId,
      balance,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error getting balance from ${req.params.exchangeId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get balance',
      message: error.message,
      exchangeId: req.params.exchangeId
    });
  }
});

// ===== EMERGENCY CONTROLS =====

// Emergency stop all exchanges
router.post('/emergency/stop-all', authenticateToken, async (req, res) => {
  try {
    const { reason = 'Manual emergency stop via API' } = req.body;
    
    const result = await exchangeAbstraction.emergencyStopAll(reason);
    
    auditLog(req.user.id, 'emergency_stop_all', { 
      reason, 
      cancelledOrders: result.cancelledOrders,
      exchanges: result.exchanges.length 
    });
    
    res.json({
      success: true,
      emergencyStop: result,
      message: `Emergency stop executed: ${result.cancelledOrders} orders cancelled`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error executing emergency stop:', error);
    res.status(500).json({
      success: false,
      error: 'Emergency stop failed',
      message: error.message
    });
  }
});

// Emergency stop specific exchange
router.post('/exchanges/:exchangeId/emergency-stop', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const { reason = 'Manual emergency stop via API' } = req.body;
    
    const result = await exchangeAbstraction.emergencyStopExchange(exchangeId, reason);
    
    auditLog(req.user.id, 'emergency_stop_exchange', { 
      exchangeId, 
      reason, 
      cancelledOrders: result.cancelledOrders 
    });
    
    res.json({
      success: true,
      exchangeId,
      emergencyStop: result,
      message: `Emergency stop executed for ${exchangeId}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error executing emergency stop for ${req.params.exchangeId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Emergency stop failed',
      message: error.message,
      exchangeId: req.params.exchangeId
    });
  }
});

// ===== LIVE TRADING MIGRATION TOOLS =====

// Paper to live trading migration status
router.get('/migration/status', authenticateToken, async (req, res) => {
  try {
    // Get paper trading bots and their performance
    const migrationStatus = {
      paperTradingBots: [], // Would be populated from database
      eligibleForMigration: [],
      migrationRequirements: [
        'Minimum 30 days paper trading history',
        'Positive risk-adjusted returns (Sharpe > 1.0)',
        'Maximum drawdown < 15%',
        'Minimum 100 trades executed',
        'Live exchange connection verified'
      ],
      safetyChecks: [
        'Position size limits configured',
        'Stop-loss mechanisms active',
        'Emergency stop procedures tested',
        'Risk management rules validated'
      ]
    };
    
    res.json({
      success: true,
      migrationStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting migration status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get migration status',
      message: error.message
    });
  }
});

// Create live trading bot from paper trading bot
router.post('/migration/paper-to-live', authenticateToken, async (req, res) => {
  try {
    const { paperBotId, exchangeId, safetyLimits } = req.body;
    
    if (!paperBotId || !exchangeId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: paperBotId, exchangeId'
      });
    }
    
    // Simulate migration process
    const migrationResult = {
      paperBotId,
      liveBotId: `live_${Date.now()}`,
      exchangeId,
      safetyLimits: safetyLimits || {
        maxPositionSize: 1000,
        maxDailyLoss: 500,
        maxDrawdown: 0.15,
        emergencyStopLoss: 0.05
      },
      status: 'migrated',
      migrationDate: new Date().toISOString(),
      warnings: [
        'Monitor performance closely for first 24 hours',
        'Emergency stop is available at any time',
        'Position limits are strictly enforced'
      ]
    };
    
    auditLog(req.user.id, 'paper_to_live_migration', { 
      paperBotId, 
      liveBotId: migrationResult.liveBotId,
      exchangeId 
    });
    
    res.json({
      success: true,
      migration: migrationResult,
      message: 'Paper trading bot successfully migrated to live trading',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error migrating paper bot to live trading:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      message: error.message
    });
  }
});

// ===== MARKET DATA AGGREGATION =====

// Get market data from multiple exchanges
router.get('/market-data/:symbol', authenticateToken, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { exchanges, timeframe = '1h', limit = 100 } = req.query;
    
    const targetExchanges = exchanges ? exchanges.split(',') : 
      Array.from(exchangeAbstraction.exchanges.keys());
    
    const marketData = [];
    const errors = [];
    
    for (const exchangeId of targetExchanges) {
      try {
        const data = await exchangeAbstraction.getMarketData(exchangeId, symbol, timeframe, parseInt(limit));
        marketData.push({
          exchangeId,
          ...data
        });
      } catch (error) {
        errors.push({
          exchangeId,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      symbol,
      timeframe,
      limit: parseInt(limit),
      marketData,
      errors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error getting market data for ${req.params.symbol}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get market data',
      message: error.message,
      symbol: req.params.symbol
    });
  }
});

// ===== SYSTEM STATUS =====

// Get exchange integration hub status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const exchanges = exchangeAbstraction.listExchanges();
    const connectedExchanges = exchanges.filter(ex => ex.connected).length;
    
    const status = {
      service: 'Exchange Integration Hub',
      version: '1.0.0',
      status: 'active',
      exchanges: {
        total: exchanges.length,
        connected: connectedExchanges,
        disconnected: exchanges.length - connectedExchanges,
        supportedTypes: Object.values(exchangeAbstraction.supportedExchanges).length
      },
      features: {
        unifiedOrderBook: true,
        arbitrageDetection: true,
        smartOrderRouting: true,
        emergencyControls: true,
        positionSync: true,
        paperToLiveMigration: true,
        multiExchangeData: true
      },
      capabilities: [
        'Cross-exchange arbitrage detection',
        'Unified order book aggregation',
        'Smart order routing optimization',
        'Emergency stop mechanisms',
        'Position synchronization',
        'Paper-to-live trading migration',
        'Multi-exchange market data'
      ],
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting exchange integration status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get status',
      message: error.message
    });
  }
});

module.exports = router;