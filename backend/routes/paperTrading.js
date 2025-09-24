const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/init');
const { authenticateToken, auditLog } = require('../middleware/auth');
const PaperTradingService = require('../utils/paperTradingService');
const logger = require('../utils/logger');
const { evaluateOrder } = require('../utils/riskEngine');

const router = express.Router();

// Initialize paper trading service
const paperTradingService = new PaperTradingService();

// Start real-time processing
paperTradingService.startRealTimeProcessing(5000); // 5 second intervals

// Create paper trading portfolio
router.post('/portfolios', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      initialBalance = 100000,
      currency = 'USD',
      riskProfile = 'moderate',
      tradingStrategy = null
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Portfolio name is required' });
    }

    const portfolio = await paperTradingService.createPortfolio({
      name,
      initialBalance,
      currency,
      riskProfile,
      tradingStrategy,
      userId: req.user.id
    });

    // Store in database
    const query = `
      INSERT INTO paper_portfolios (
        id, user_id, name, initial_balance, current_balance, currency, 
        risk_profile, trading_strategy, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    db.run(query, [
      portfolio.id,
      req.user.id,
      name,
      initialBalance,
      initialBalance,
      currency,
      riskProfile,
      JSON.stringify(tradingStrategy),
      'active'
    ], function(err) {
      if (err) {
        logger.error('Database error creating portfolio:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      auditLog(req.user.id, 'CREATE_PAPER_PORTFOLIO', { 
        portfolioId: portfolio.id, 
        initialBalance 
      });

      res.json({
        portfolioId: portfolio.id,
        name: portfolio.name,
        initialBalance: portfolio.initialBalance,
        currentBalance: portfolio.currentBalance,
        currency: portfolio.currency,
        riskProfile: portfolio.riskProfile,
        status: portfolio.status,
        createdAt: portfolio.createdAt,
        message: 'Paper trading portfolio created successfully'
      });
    });

  } catch (error) {
    logger.error('Error creating paper portfolio:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's paper trading portfolios
router.get('/portfolios', authenticateToken, (req, res) => {
  try {
    const query = `
      SELECT 
        p.*,
        (SELECT COUNT(*) FROM paper_orders WHERE portfolio_id = p.id) as total_orders,
        (SELECT COUNT(*) FROM paper_trades WHERE portfolio_id = p.id) as total_trades
      FROM paper_portfolios p
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `;

    db.all(query, [req.user.id], (err, portfolios) => {
      if (err) {
        logger.error('Database error fetching portfolios:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      // Get portfolio details from service
      const detailedPortfolios = portfolios.map(dbPortfolio => {
        try {
          const servicePortfolio = paperTradingService.getPortfolio(dbPortfolio.id);
          return {
            ...dbPortfolio,
            positions: servicePortfolio.positions,
            performance: servicePortfolio.performance
          };
        } catch (error) {
          logger.warn(`Portfolio ${dbPortfolio.id} not found in service`);
          return dbPortfolio;
        }
      });

      res.json({ portfolios: detailedPortfolios });
    });

  } catch (error) {
    logger.error('Error fetching portfolios:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific portfolio details
router.get('/portfolios/:portfolioId', authenticateToken, (req, res) => {
  try {
    const { portfolioId } = req.params;

    // Verify portfolio ownership
    const query = 'SELECT * FROM paper_portfolios WHERE id = ? AND user_id = ?';
    db.get(query, [portfolioId, req.user.id], (err, dbPortfolio) => {
      if (err) {
        logger.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!dbPortfolio) {
        return res.status(404).json({ error: 'Portfolio not found' });
      }

      try {
        const portfolio = paperTradingService.getPortfolio(portfolioId);
        res.json(portfolio);
      } catch (serviceError) {
        logger.error('Service error:', serviceError);
        res.status(404).json({ error: 'Portfolio not found in trading service' });
      }
    });

  } catch (error) {
    logger.error('Error fetching portfolio:', error);
    res.status(500).json({ error: error.message });
  }
});

// Place paper trading order
const { validate, schemas } = require('../utils/validation');
router.post('/portfolios/:portfolioId/orders', authenticateToken, validate(schemas.paperOrderSchema), async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { symbol, side, type, quantity, price = null, stopPrice = null, timeInForce = 'GTC' } = req.validated;

    // Fields are pre-validated by middleware

    // Verify portfolio ownership
    const query = 'SELECT * FROM paper_portfolios WHERE id = ? AND user_id = ?';
    db.get(query, [portfolioId, req.user.id], async (err, portfolio) => {
      if (err) {
        logger.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found' });
      }

      try {
        // Risk checks
        const risk = evaluateOrder({
          portfolio,
          symbol,
          side,
          type,
          quantity: parseFloat(quantity),
          price: price ? parseFloat(price) : null
        });
        if (!risk.allowed) {
          return res.status(400).json({ error: `Order blocked by risk engine: ${risk.reason}` });
        }

        const order = await paperTradingService.placeOrder(portfolioId, {
          symbol,
          side,
          type,
          quantity: parseFloat(quantity),
          price: price ? parseFloat(price) : null,
          stopPrice: stopPrice ? parseFloat(stopPrice) : null,
          timeInForce
        });

        // Store order in database
        const insertQuery = `
          INSERT INTO paper_orders (
            id, portfolio_id, user_id, symbol, side, type, quantity, price, 
            stop_price, time_in_force, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `;

        db.run(insertQuery, [
          order.id,
          portfolioId,
          req.user.id,
          symbol,
          side,
          type,
          quantity,
          price,
          stopPrice,
          timeInForce,
          order.status
        ]);

        auditLog(req.user.id, 'PLACE_PAPER_ORDER', { 
          portfolioId, 
          orderId: order.id, 
          symbol, 
          side, 
          type,
          quantity 
        });

        res.json({
          orderId: order.id,
          symbol: order.symbol,
          side: order.side,
          type: order.type,
          quantity: order.quantity,
          status: order.status,
          createdAt: order.createdAt,
          message: `${side.toUpperCase()} order for ${quantity} ${symbol} placed successfully`
        });

      } catch (serviceError) {
        logger.error('Paper trading service error:', serviceError);
        res.status(400).json({ error: serviceError.message });
      }
    });

  } catch (error) {
    logger.error('Error placing order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel paper trading order
router.delete('/portfolios/:portfolioId/orders/:orderId', authenticateToken, (req, res) => {
  try {
    const { portfolioId, orderId } = req.params;

    // Verify portfolio ownership
    const query = 'SELECT * FROM paper_portfolios WHERE id = ? AND user_id = ?';
    db.get(query, [portfolioId, req.user.id], (err, portfolio) => {
      if (err) {
        logger.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found' });
      }

      try {
        const order = paperTradingService.cancelOrder(portfolioId, orderId);

        // Update order in database
        const updateQuery = `
          UPDATE paper_orders 
          SET status = 'cancelled', updated_at = datetime('now')
          WHERE id = ? AND portfolio_id = ? AND user_id = ?
        `;

        db.run(updateQuery, [orderId, portfolioId, req.user.id]);

        auditLog(req.user.id, 'CANCEL_PAPER_ORDER', { 
          portfolioId, 
          orderId 
        });

        res.json({
          orderId: order.id,
          status: order.status,
          message: 'Order cancelled successfully'
        });

      } catch (serviceError) {
        logger.error('Paper trading service error:', serviceError);
        res.status(400).json({ error: serviceError.message });
      }
    });

  } catch (error) {
    logger.error('Error cancelling order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get trading statistics
router.get('/portfolios/:portfolioId/stats', authenticateToken, (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { period = '1M' } = req.query;

    // Verify portfolio ownership
    const query = 'SELECT * FROM paper_portfolios WHERE id = ? AND user_id = ?';
    db.get(query, [portfolioId, req.user.id], (err, portfolio) => {
      if (err) {
        logger.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found' });
      }

      try {
        const stats = paperTradingService.getTradingStats(portfolioId, period);
        res.json(stats);
      } catch (serviceError) {
        logger.error('Paper trading service error:', serviceError);
        res.status(400).json({ error: serviceError.message });
      }
    });

  } catch (error) {
    logger.error('Error fetching trading stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get portfolio performance history
router.get('/portfolios/:portfolioId/performance', authenticateToken, (req, res) => {
  try {
    const { portfolioId } = req.params;

    // Verify portfolio ownership
    const query = 'SELECT * FROM paper_portfolios WHERE id = ? AND user_id = ?';
    db.get(query, [portfolioId, req.user.id], (err, portfolio) => {
      if (err) {
        logger.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found' });
      }

      // Get performance history from database
      const historyQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as trades,
          SUM(CASE WHEN realized_pnl > 0 THEN realized_pnl ELSE 0 END) as wins,
          SUM(CASE WHEN realized_pnl < 0 THEN realized_pnl ELSE 0 END) as losses,
          SUM(realized_pnl) as total_pnl
        FROM paper_trades 
        WHERE portfolio_id = ?
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      db.all(historyQuery, [portfolioId], (err, history) => {
        if (err) {
          logger.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({ 
          portfolioId, 
          performanceHistory: history 
        });
      });
    });

  } catch (error) {
    logger.error('Error fetching performance history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Paper trading dashboard summary
router.get('/dashboard', authenticateToken, (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_portfolios,
        SUM(current_balance) as total_value,
        AVG(current_balance - initial_balance) as avg_pnl,
        (SELECT COUNT(*) FROM paper_orders WHERE user_id = ?) as total_orders,
        (SELECT COUNT(*) FROM paper_trades WHERE user_id = ?) as total_trades
      FROM paper_portfolios 
      WHERE user_id = ? AND status = 'active'
    `;

    db.get(query, [req.user.id, req.user.id, req.user.id], (err, summary) => {
      if (err) {
        logger.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      // Get recent activity
      const activityQuery = `
        SELECT 
          'order' as type, symbol, side, quantity, created_at
        FROM paper_orders 
        WHERE user_id = ?
        UNION ALL
        SELECT 
          'trade' as type, symbol, side, quantity, created_at
        FROM paper_trades 
        WHERE user_id = ?
        ORDER BY created_at DESC 
        LIMIT 10
      `;

      db.all(activityQuery, [req.user.id, req.user.id], (err, activity) => {
        if (err) {
          logger.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({
          summary: {
            totalPortfolios: summary.total_portfolios || 0,
            totalValue: summary.total_value || 0,
            averagePnL: summary.avg_pnl || 0,
            totalOrders: summary.total_orders || 0,
            totalTrades: summary.total_trades || 0
          },
          recentActivity: activity
        });
      });
    });

  } catch (error) {
    logger.error('Error fetching dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;