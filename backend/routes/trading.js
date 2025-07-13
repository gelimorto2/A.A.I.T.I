const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/init');
const { authenticateToken, auditLog } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get trading signals for a bot
router.get('/signals/:botId', authenticateToken, (req, res) => {
  // Verify bot belongs to user
  db.get(
    'SELECT id FROM bots WHERE id = ? AND user_id = ?',
    [req.params.botId, req.user.id],
    (err, bot) => {
      if (err) {
        logger.error('Error checking bot ownership:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      const { limit = 50, offset = 0 } = req.query;

      db.all(
        `SELECT * FROM trading_signals 
         WHERE bot_id = ? 
         ORDER BY timestamp DESC 
         LIMIT ? OFFSET ?`,
        [req.params.botId, parseInt(limit), parseInt(offset)],
        (err, signals) => {
          if (err) {
            logger.error('Error fetching trading signals:', err);
            return res.status(500).json({ error: 'Failed to fetch signals' });
          }

          res.json({ signals });
        }
      );
    }
  );
});

// Get trades for a bot
router.get('/trades/:botId', authenticateToken, (req, res) => {
  // Verify bot belongs to user
  db.get(
    'SELECT id FROM bots WHERE id = ? AND user_id = ?',
    [req.params.botId, req.user.id],
    (err, bot) => {
      if (err) {
        logger.error('Error checking bot ownership:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      const { limit = 50, offset = 0, status } = req.query;
      let query = `SELECT * FROM trades WHERE bot_id = ?`;
      let params = [req.params.botId];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY opened_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      db.all(query, params, (err, trades) => {
        if (err) {
          logger.error('Error fetching trades:', err);
          return res.status(500).json({ error: 'Failed to fetch trades' });
        }

        res.json({ trades });
      });
    }
  );
});

// Execute manual trade
router.post('/execute', authenticateToken, auditLog('manual_trade', 'trade'), (req, res) => {
  const { botId, symbol, side, quantity, price } = req.body;

  if (!botId || !symbol || !side || !quantity) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Verify bot belongs to user
  db.get(
    'SELECT id, trading_mode FROM bots WHERE id = ? AND user_id = ?',
    [botId, req.user.id],
    (err, bot) => {
      if (err) {
        logger.error('Error checking bot ownership:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      // In a real implementation, this would interface with actual trading APIs
      // For now, we'll simulate the trade execution
      const tradeId = uuidv4();
      const executionPrice = price || (Math.random() * 1000 + 100); // Mock price
      const currentTime = new Date().toISOString();

      db.run(
        `INSERT INTO trades (id, bot_id, symbol, side, quantity, entry_price, status, opened_at)
         VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`,
        [tradeId, botId, symbol, side, quantity, executionPrice, currentTime],
        function(err) {
          if (err) {
            logger.error('Error executing trade:', err);
            return res.status(500).json({ error: 'Failed to execute trade' });
          }

          logger.info(`Manual trade executed: ${side} ${quantity} ${symbol} at ${executionPrice}`);
          
          res.json({
            message: 'Trade executed successfully',
            trade: {
              id: tradeId,
              symbol,
              side,
              quantity,
              entry_price: executionPrice,
              status: 'open'
            }
          });
        }
      );
    }
  );
});

// Close trade
router.post('/trades/:tradeId/close', authenticateToken, auditLog('close_trade', 'trade'), (req, res) => {
  const { price } = req.body;

  // First, verify the trade belongs to the user's bot
  db.get(
    `SELECT t.*, b.user_id FROM trades t 
     JOIN bots b ON t.bot_id = b.id 
     WHERE t.id = ? AND b.user_id = ?`,
    [req.params.tradeId, req.user.id],
    (err, trade) => {
      if (err) {
        logger.error('Error checking trade ownership:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!trade) {
        return res.status(404).json({ error: 'Trade not found' });
      }

      if (trade.status !== 'open') {
        return res.status(400).json({ error: 'Trade is not open' });
      }

      const exitPrice = price || (Math.random() * 1000 + 100); // Mock price
      const pnl = (exitPrice - trade.entry_price) * trade.quantity * (trade.side === 'buy' ? 1 : -1);
      const currentTime = new Date().toISOString();

      db.run(
        `UPDATE trades 
         SET exit_price = ?, pnl = ?, status = 'closed', closed_at = ?
         WHERE id = ?`,
        [exitPrice, pnl, currentTime, req.params.tradeId],
        function(err) {
          if (err) {
            logger.error('Error closing trade:', err);
            return res.status(500).json({ error: 'Failed to close trade' });
          }

          logger.info(`Trade closed: ${req.params.tradeId} with PnL: ${pnl}`);
          
          res.json({
            message: 'Trade closed successfully',
            trade: {
              id: req.params.tradeId,
              exit_price: exitPrice,
              pnl,
              status: 'closed'
            }
          });
        }
      );
    }
  );
});

// Get market data (mock endpoint)
router.get('/market-data/:symbol', authenticateToken, (req, res) => {
  const { symbol } = req.params;
  const { timeframe = '1m', limit = 100 } = req.query;

  // In a real implementation, this would fetch from actual market data providers
  // For now, we'll return mock data
  const mockData = Array.from({ length: parseInt(limit) }, (_, i) => {
    const timestamp = new Date(Date.now() - i * 60000).toISOString();
    const basePrice = 100 + Math.sin(i * 0.1) * 10;
    const volatility = Math.random() * 2;
    
    return {
      symbol,
      timestamp,
      open: basePrice + Math.random() * volatility - volatility / 2,
      high: basePrice + Math.random() * volatility,
      low: basePrice - Math.random() * volatility,
      close: basePrice + Math.random() * volatility - volatility / 2,
      volume: Math.random() * 1000000,
      timeframe
    };
  }).reverse();

  res.json({ data: mockData });
});

// Get real-time price (mock endpoint)
router.get('/price/:symbol', authenticateToken, (req, res) => {
  const { symbol } = req.params;
  
  // Mock real-time price
  const price = {
    symbol,
    price: 100 + Math.random() * 50,
    timestamp: new Date().toISOString(),
    bid: 99.5 + Math.random() * 50,
    ask: 100.5 + Math.random() * 50,
    volume: Math.random() * 1000000
  };

  res.json(price);
});

module.exports = router;