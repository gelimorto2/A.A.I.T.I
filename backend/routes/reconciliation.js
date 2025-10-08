const express = require('express');
const OrderReconciliationService = require('../services/orderReconciliationService');
const TradingModeDBManager = require('../services/tradingModeDBManager');
const exchangeAdapterFactory = require('../services/exchangeAdapterFactory');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Initialize services
const dbManager = new TradingModeDBManager();
const reconciliationService = new OrderReconciliationService(exchangeAdapterFactory, dbManager);

// Start reconciliation service on module load
reconciliationService.start().catch(error => {
  logger.error('Failed to start order reconciliation service', { error: error.message });
});

/**
 * GET /api/reconciliation/status
 * Get reconciliation service status and metrics
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const metrics = reconciliationService.getMetrics();
    
    res.json({
      success: true,
      data: {
        service: 'order_reconciliation',
        ...metrics,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to get reconciliation status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get reconciliation status'
    });
  }
});

/**
 * POST /api/reconciliation/start
 * Start the reconciliation service
 */
router.post('/start', authenticateToken, async (req, res) => {
  try {
    // Check admin permissions
    if (!req.user.permissions.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: 'Admin permissions required'
      });
    }

    await reconciliationService.start();
    
    res.json({
      success: true,
      message: 'Order reconciliation service started'
    });

  } catch (error) {
    logger.error('Failed to start reconciliation service', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to start reconciliation service'
    });
  }
});

/**
 * POST /api/reconciliation/stop
 * Stop the reconciliation service
 */
router.post('/stop', authenticateToken, async (req, res) => {
  try {
    // Check admin permissions
    if (!req.user.permissions.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: 'Admin permissions required'
      });
    }

    await reconciliationService.stop();
    
    res.json({
      success: true,
      message: 'Order reconciliation service stopped'
    });

  } catch (error) {
    logger.error('Failed to stop reconciliation service', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to stop reconciliation service'
    });
  }
});

/**
 * POST /api/reconciliation/run
 * Manually trigger reconciliation
 */
router.post('/run', authenticateToken, async (req, res) => {
  try {
    // Check admin permissions
    if (!req.user.permissions.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: 'Admin permissions required'
      });
    }

    const results = await reconciliationService.runReconciliation();
    
    res.json({
      success: true,
      data: results,
      message: 'Manual reconciliation completed'
    });

  } catch (error) {
    logger.error('Failed to run manual reconciliation', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to run manual reconciliation'
    });
  }
});

/**
 * GET /api/reconciliation/:tradingMode/history
 * Get reconciliation history for trading mode
 */
router.get('/:tradingMode/history', authenticateToken, async (req, res) => {
  try {
    const { tradingMode } = req.params;
    const { limit = 100 } = req.query;
    
    if (!['paper', 'live'].includes(tradingMode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid trading mode'
      });
    }

    // Check permissions for live trading
    if (tradingMode === 'live' && !req.user.permissions.includes('live_trading')) {
      return res.status(403).json({
        success: false,
        error: 'Live trading permissions required'
      });
    }

    const history = await reconciliationService.getReconciliationHistory(
      tradingMode,
      parseInt(limit)
    );
    
    res.json({
      success: true,
      data: {
        tradingMode,
        history,
        count: history.length
      }
    });

  } catch (error) {
    logger.error('Failed to get reconciliation history', {
      tradingMode: req.params.tradingMode,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get reconciliation history'
    });
  }
});

/**
 * POST /api/reconciliation/:tradingMode/order/:orderId
 * Manually reconcile specific order
 */
router.post('/:tradingMode/order/:orderId', authenticateToken, async (req, res) => {
  try {
    const { tradingMode, orderId } = req.params;
    
    if (!['paper', 'live'].includes(tradingMode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid trading mode'
      });
    }

    // Check permissions for live trading
    if (tradingMode === 'live' && !req.user.permissions.includes('live_trading')) {
      return res.status(403).json({
        success: false,
        error: 'Live trading permissions required'
      });
    }

    const result = await reconciliationService.reconcileOrderManually(
      tradingMode,
      parseInt(orderId)
    );
    
    res.json({
      success: true,
      data: {
        tradingMode,
        orderId: parseInt(orderId),
        ...result
      },
      message: result.discrepancy ? 
        (result.resolved ? 'Discrepancy found and resolved' : 'Discrepancy found but not resolved') :
        'No discrepancy found'
    });

  } catch (error) {
    logger.error('Failed to reconcile order manually', {
      tradingMode: req.params.tradingMode,
      orderId: req.params.orderId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to reconcile order'
    });
  }
});

/**
 * GET /api/reconciliation/:tradingMode/discrepancies
 * Get active discrepancies for trading mode
 */
router.get('/:tradingMode/discrepancies', authenticateToken, async (req, res) => {
  try {
    const { tradingMode } = req.params;
    const { status = 'discrepancy', limit = 50 } = req.query;
    
    if (!['paper', 'live'].includes(tradingMode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid trading mode'
      });
    }

    // Check permissions for live trading
    if (tradingMode === 'live' && !req.user.permissions.includes('live_trading')) {
      return res.status(403).json({
        success: false,
        error: 'Live trading permissions required'
      });
    }

    const connection = dbManager.getConnection(tradingMode);
    
    const discrepancies = await connection('reconciliation_logs')
      .select('reconciliation_logs.*', 'accounts.name as account_name', 'orders.symbol')
      .join('accounts', 'reconciliation_logs.account_id', 'accounts.id')
      .leftJoin('orders', 'reconciliation_logs.reference_id', 'orders.id')
      .where('reconciliation_logs.status', status)
      .orderBy('reconciliation_logs.created_at', 'desc')
      .limit(parseInt(limit));

    // Parse discrepancy details
    discrepancies.forEach(discrepancy => {
      discrepancy.discrepancy_details = JSON.parse(discrepancy.discrepancy_details || '{}');
    });
    
    res.json({
      success: true,
      data: {
        tradingMode,
        discrepancies,
        count: discrepancies.length,
        status
      }
    });

  } catch (error) {
    logger.error('Failed to get discrepancies', {
      tradingMode: req.params.tradingMode,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get discrepancies'
    });
  }
});

/**
 * POST /api/reconciliation/:tradingMode/discrepancies/:discrepancyId/resolve
 * Manually resolve specific discrepancy
 */
router.post('/:tradingMode/discrepancies/:discrepancyId/resolve', authenticateToken, async (req, res) => {
  try {
    const { tradingMode, discrepancyId } = req.params;
    const { resolution_action } = req.body;
    
    if (!['paper', 'live'].includes(tradingMode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid trading mode'
      });
    }

    // Check permissions for live trading
    if (tradingMode === 'live' && !req.user.permissions.includes('live_trading')) {
      return res.status(403).json({
        success: false,
        error: 'Live trading permissions required'
      });
    }

    const connection = dbManager.getConnection(tradingMode);
    
    // Get the discrepancy
    const discrepancy = await connection('reconciliation_logs')
      .where({ id: discrepancyId })
      .first();

    if (!discrepancy) {
      return res.status(404).json({
        success: false,
        error: 'Discrepancy not found'
      });
    }

    // Update discrepancy status
    await connection('reconciliation_logs')
      .where({ id: discrepancyId })
      .update({
        status: 'resolved',
        resolution_action: resolution_action || 'Manual resolution',
        resolved_at: new Date(),
        updated_at: new Date()
      });

    // Log the manual resolution
    await dbManager.logAuditEvent(tradingMode, {
      type: 'discrepancy_manually_resolved',
      accountId: discrepancy.account_id,
      userId: req.user.id,
      description: `Discrepancy ${discrepancyId} manually resolved`,
      metadata: {
        discrepancyId,
        resolution_action,
        original_discrepancy: JSON.parse(discrepancy.discrepancy_details || '{}')
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      message: 'Discrepancy manually resolved'
    });

  } catch (error) {
    logger.error('Failed to resolve discrepancy manually', {
      tradingMode: req.params.tradingMode,
      discrepancyId: req.params.discrepancyId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to resolve discrepancy'
    });
  }
});

/**
 * GET /api/reconciliation/metrics
 * Get comprehensive reconciliation metrics
 */
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const serviceMetrics = reconciliationService.getMetrics();
    
    // Get database-level metrics
    const paperConnection = dbManager.getConnection('paper');
    const liveConnection = dbManager.getConnection('live');
    
    const [paperDiscrepancies, liveDiscrepancies] = await Promise.all([
      paperConnection('reconciliation_logs')
        .count('* as total')
        .select(
          paperConnection.raw('SUM(CASE WHEN status = "discrepancy" THEN 1 ELSE 0 END) as active'),
          paperConnection.raw('SUM(CASE WHEN status = "resolved" THEN 1 ELSE 0 END) as resolved')
        )
        .first(),
      liveConnection('reconciliation_logs')
        .count('* as total')
        .select(
          liveConnection.raw('SUM(CASE WHEN status = "discrepancy" THEN 1 ELSE 0 END) as active'),
          liveConnection.raw('SUM(CASE WHEN status = "resolved" THEN 1 ELSE 0 END) as resolved')
        )
        .first()
    ]);
    
    res.json({
      success: true,
      data: {
        service: serviceMetrics,
        database: {
          paper: paperDiscrepancies,
          live: liveDiscrepancies
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to get reconciliation metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get reconciliation metrics'
    });
  }
});

/**
 * Event handlers for reconciliation service
 */
reconciliationService.on('discrepancy_detected', (data) => {
  logger.warn('Discrepancy detected', data);
});

reconciliationService.on('discrepancy_resolved', (data) => {
  logger.info('Discrepancy resolved', data);
});

reconciliationService.on('high_discrepancy_alert', (data) => {
  logger.error('High discrepancy alert', data);
  // Could trigger external alerting system here
});

reconciliationService.on('reconciliation_error', (error) => {
  logger.error('Reconciliation service error', { error: error.message });
});

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  logger.error('Order reconciliation router error', {
    error: error.message,
    stack: error.stack,
    url: req.url
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down order reconciliation service...');
  try {
    await reconciliationService.stop();
    await dbManager.close();
  } catch (error) {
    logger.error('Error during reconciliation service shutdown', { error: error.message });
  }
});

module.exports = router;