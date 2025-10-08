const express = require('express');
const TradingModeDBManager = require('../services/tradingModeDBManager');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const dbManager = new TradingModeDBManager();

/**
 * Middleware to validate trading mode
 */
const validateTradingMode = (req, res, next) => {
  const { tradingMode } = req.params;
  
  if (!['paper', 'live'].includes(tradingMode)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid trading mode. Must be "paper" or "live"'
    });
  }
  
  req.tradingMode = tradingMode;
  next();
};

/**
 * Middleware to check live trading permissions
 */
const checkLiveTradingPermissions = (req, res, next) => {
  if (req.tradingMode === 'live') {
    // Check if user has live trading permissions
    if (!req.user.permissions.includes('live_trading')) {
      return res.status(403).json({
        success: false,
        error: 'Live trading permissions required'
      });
    }
  }
  next();
};

/**
 * Initialize database manager
 */
router.use(async (req, res, next) => {
  try {
    if (!dbManager.connections.paper || !dbManager.connections.live) {
      await dbManager.initialize();
    }
    next();
  } catch (error) {
    logger.error('Failed to initialize trading mode database manager', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Database initialization failed'
    });
  }
});

// Routes

/**
 * GET /api/trading-modes/:tradingMode/accounts
 * Get accounts for trading mode
 */
router.get('/:tradingMode/accounts', 
  authenticateToken, 
  validateTradingMode, 
  checkLiveTradingPermissions,
  async (req, res) => {
    try {
      const connection = dbManager.getConnection(req.tradingMode);
      
      const accounts = await connection('accounts')
        .select('*')
        .where({ status: 'active' })
        .orderBy('created_at', 'desc');

      // Parse metadata for each account
      accounts.forEach(account => {
        account.metadata = JSON.parse(account.metadata || '{}');
      });

      res.json({
        success: true,
        data: {
          tradingMode: req.tradingMode,
          accounts,
          count: accounts.length
        }
      });

    } catch (error) {
      logger.error('Failed to get accounts', { 
        tradingMode: req.tradingMode, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve accounts'
      });
    }
  }
);

/**
 * POST /api/trading-modes/:tradingMode/accounts
 * Create account for trading mode
 */
router.post('/:tradingMode/accounts',
  authenticateToken,
  validateTradingMode,
  checkLiveTradingPermissions,
  async (req, res) => {
    try {
      const accountData = {
        name: req.body.name,
        exchange: req.body.exchange,
        credentials: req.body.credentials,
        initialBalance: req.body.initialBalance || 0,
        currency: req.body.currency || 'USD',
        riskProfile: req.body.riskProfile || 'moderate'
      };

      const account = await dbManager.createAccount(req.tradingMode, accountData);

      // Log account creation
      await dbManager.logAuditEvent(req.tradingMode, {
        type: 'account_created',
        accountId: account.id,
        userId: req.user.id,
        description: `Account ${account.name} created for ${req.tradingMode} trading`,
        metadata: { accountData },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        success: true,
        data: account
      });

    } catch (error) {
      logger.error('Failed to create account', {
        tradingMode: req.tradingMode,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Failed to create account'
      });
    }
  }
);

/**
 * GET /api/trading-modes/:tradingMode/accounts/:accountId
 * Get specific account
 */
router.get('/:tradingMode/accounts/:accountId',
  authenticateToken,
  validateTradingMode,
  checkLiveTradingPermissions,
  async (req, res) => {
    try {
      const account = await dbManager.getAccount(req.tradingMode, req.params.accountId);

      res.json({
        success: true,
        data: account
      });

    } catch (error) {
      logger.error('Failed to get account', {
        tradingMode: req.tradingMode,
        accountId: req.params.accountId,
        error: error.message
      });
      res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
  }
);

/**
 * GET /api/trading-modes/:tradingMode/orders
 * Get orders for trading mode
 */
router.get('/:tradingMode/orders',
  authenticateToken,
  validateTradingMode,
  checkLiveTradingPermissions,
  async (req, res) => {
    try {
      const connection = dbManager.getConnection(req.tradingMode);
      const { accountId, status, symbol, limit = 50, offset = 0 } = req.query;

      let query = connection('orders')
        .select('orders.*', 'accounts.name as account_name')
        .join('accounts', 'orders.account_id', 'accounts.id')
        .orderBy('orders.created_at', 'desc')
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      if (accountId) {
        query = query.where('orders.account_id', accountId);
      }

      if (status) {
        query = query.where('orders.status', status);
      }

      if (symbol) {
        query = query.where('orders.symbol', symbol);
      }

      const orders = await query;

      // Parse metadata for each order
      orders.forEach(order => {
        order.metadata = JSON.parse(order.metadata || '{}');
      });

      res.json({
        success: true,
        data: {
          tradingMode: req.tradingMode,
          orders,
          count: orders.length,
          pagination: { limit: parseInt(limit), offset: parseInt(offset) }
        }
      });

    } catch (error) {
      logger.error('Failed to get orders', {
        tradingMode: req.tradingMode,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve orders'
      });
    }
  }
);

/**
 * GET /api/trading-modes/:tradingMode/trades
 * Get trades for trading mode
 */
router.get('/:tradingMode/trades',
  authenticateToken,
  validateTradingMode,
  checkLiveTradingPermissions,
  async (req, res) => {
    try {
      const connection = dbManager.getConnection(req.tradingMode);
      const { accountId, symbol, limit = 50, offset = 0 } = req.query;

      let query = connection('trades')
        .select('trades.*', 'accounts.name as account_name', 'orders.type as order_type')
        .join('accounts', 'trades.account_id', 'accounts.id')
        .join('orders', 'trades.order_id', 'orders.id')
        .orderBy('trades.created_at', 'desc')
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      if (accountId) {
        query = query.where('trades.account_id', accountId);
      }

      if (symbol) {
        query = query.where('trades.symbol', symbol);
      }

      const trades = await query;

      // Parse metadata for each trade
      trades.forEach(trade => {
        trade.metadata = JSON.parse(trade.metadata || '{}');
      });

      res.json({
        success: true,
        data: {
          tradingMode: req.tradingMode,
          trades,
          count: trades.length,
          pagination: { limit: parseInt(limit), offset: parseInt(offset) }
        }
      });

    } catch (error) {
      logger.error('Failed to get trades', {
        tradingMode: req.tradingMode,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve trades'
      });
    }
  }
);

/**
 * GET /api/trading-modes/:tradingMode/positions
 * Get positions for trading mode
 */
router.get('/:tradingMode/positions',
  authenticateToken,
  validateTradingMode,
  checkLiveTradingPermissions,
  async (req, res) => {
    try {
      const connection = dbManager.getConnection(req.tradingMode);
      const { accountId, status = 'open' } = req.query;

      let query = connection('positions')
        .select('positions.*', 'accounts.name as account_name')
        .join('accounts', 'positions.account_id', 'accounts.id')
        .where('positions.status', status)
        .orderBy('positions.created_at', 'desc');

      if (accountId) {
        query = query.where('positions.account_id', accountId);
      }

      const positions = await query;

      // Parse metadata for each position
      positions.forEach(position => {
        position.metadata = JSON.parse(position.metadata || '{}');
      });

      res.json({
        success: true,
        data: {
          tradingMode: req.tradingMode,
          positions,
          count: positions.length
        }
      });

    } catch (error) {
      logger.error('Failed to get positions', {
        tradingMode: req.tradingMode,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve positions'
      });
    }
  }
);

/**
 * GET /api/trading-modes/:tradingMode/statistics
 * Get trading statistics for mode
 */
router.get('/:tradingMode/statistics',
  authenticateToken,
  validateTradingMode,
  checkLiveTradingPermissions,
  async (req, res) => {
    try {
      const { accountId, timeRange = '24h' } = req.query;
      
      const statistics = await dbManager.getTradingStatistics(
        req.tradingMode,
        accountId,
        timeRange
      );

      res.json({
        success: true,
        data: statistics
      });

    } catch (error) {
      logger.error('Failed to get trading statistics', {
        tradingMode: req.tradingMode,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve statistics'
      });
    }
  }
);

/**
 * GET /api/trading-modes/:tradingMode/audit-logs
 * Get audit logs for trading mode
 */
router.get('/:tradingMode/audit-logs',
  authenticateToken,
  validateTradingMode,
  checkLiveTradingPermissions,
  async (req, res) => {
    try {
      const connection = dbManager.getConnection(req.tradingMode);
      const { accountId, eventType, limit = 100, offset = 0 } = req.query;

      let query = connection('audit_logs')
        .select('*')
        .orderBy('created_at', 'desc')
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      if (accountId) {
        query = query.where('account_id', accountId);
      }

      if (eventType) {
        query = query.where('event_type', eventType);
      }

      const logs = await query;

      // Parse metadata for each log
      logs.forEach(log => {
        log.metadata = JSON.parse(log.metadata || '{}');
      });

      res.json({
        success: true,
        data: {
          tradingMode: req.tradingMode,
          logs,
          count: logs.length,
          pagination: { limit: parseInt(limit), offset: parseInt(offset) }
        }
      });

    } catch (error) {
      logger.error('Failed to get audit logs', {
        tradingMode: req.tradingMode,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit logs'
      });
    }
  }
);

/**
 * POST /api/trading-modes/validate-isolation
 * Validate data isolation between trading modes
 */
router.post('/validate-isolation',
  authenticateToken,
  async (req, res) => {
    try {
      // Check if user has admin permissions
      if (!req.user.permissions.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: 'Admin permissions required'
        });
      }

      const validation = await dbManager.validateDataIsolation();

      res.json({
        success: true,
        data: validation
      });

    } catch (error) {
      logger.error('Failed to validate data isolation', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to validate data isolation'
      });
    }
  }
);

/**
 * POST /api/trading-modes/:tradingMode/cleanup
 * Cleanup old data for trading mode
 */
router.post('/:tradingMode/cleanup',
  authenticateToken,
  validateTradingMode,
  async (req, res) => {
    try {
      // Check if user has admin permissions
      if (!req.user.permissions.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: 'Admin permissions required'
        });
      }

      const { olderThanDays = 30 } = req.body;
      
      const results = await dbManager.cleanupOldData(req.tradingMode, olderThanDays);

      // Log cleanup operation
      await dbManager.logAuditEvent(req.tradingMode, {
        type: 'data_cleanup',
        userId: req.user.id,
        description: `Data cleanup performed for ${req.tradingMode} mode`,
        metadata: { results, olderThanDays },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        data: results
      });

    } catch (error) {
      logger.error('Failed to cleanup data', {
        tradingMode: req.tradingMode,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup data'
      });
    }
  }
);

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  logger.error('Trading mode router error', {
    error: error.message,
    stack: error.stack,
    tradingMode: req.tradingMode,
    url: req.url
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

module.exports = router;